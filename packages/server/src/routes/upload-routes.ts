/**
 * upload-routes.ts — POST /api/upload/presign + PUT /data/:key + GET /serve
 *
 * Armazenamento:
 *   - Produção: Cloudflare R2 ou AWS S3 via object-storage.ts
 *   - Dev local: in-memory Map (ALLOW_MEMORY_FALLBACK=true ou NODE_ENV≠production)
 *
 * Fluxo do frontend:
 *   POST /api/upload/presign  → { presignedUrl, imageUrl, key }
 *   PUT  presignedUrl          → envia binário → armazena no provider ativo
 *   GET  /api/upload/serve?key=... → serve a imagem (proxy para R2 em prod ou memória em dev)
 *
 * Limites: jpg/jpeg/png/webp, máx 5MB.
 */

import { Hono, type Context } from "hono";
import { db } from "../db/client";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import {
  putObject,
  getObject,
  checkStorageHealth,
  getPublicUrl,
  reserveSlot,
  hasSlot,
  STORAGE_PROVIDER,
  MEMORY_FALLBACK_ENABLED,
} from "../storage/object-storage";

export const uploadRoutes = new Hono();

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SIZE_BYTES  = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME    = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const UPLOAD_TTL_MS   = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSessionUser(c: Context<any>) {
  const sessionId = getCookie(c, "smm_session");
  if (!sessionId) return null;

  const session = await db
    .select({ user_id: sessions.user_id, expires_at: sessions.expires_at })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  return await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.user_id))
    .get() ?? null;
}

function generateKey(uploadType: string, ext: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts   = Date.now().toString(36);
  return `${uploadType}/${ts}-${rand}.${ext}`;
}

function extFromMime(mime: string): string {
  return ({ "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" })[mime] ?? "jpg";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBaseUrl(c: Context<any>): string {
  return c.req.url.replace(/\/api\/upload\/presign.*$/, "");
}

// ─── POST /api/upload/presign ─────────────────────────────────────────────────
uploadRoutes.post("/presign", async (c) => {
  // Auth
  const sessionUser = await getSessionUser(c);
  if (!sessionUser) {
    return c.json({ success: false, error: "Sessão expirada. Faça login novamente." }, 401);
  }

  // Verificar saúde do storage antes de aceitar upload
  const health = await checkStorageHealth();
  if (!health.configured) {
    return c.json({
      success: false,
      error: "Serviço de upload temporariamente indisponível. Tente novamente mais tarde.",
      code: "STORAGE_UNAVAILABLE",
    }, 503);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const { filename: _filename, contentType, uploadType, fileSize } = body as {
    filename?: string;
    contentType?: string;
    uploadType?: string;
    fileSize?: number;
  };

  // Validate MIME
  const mime = (contentType ?? "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return c.json({ success: false, error: `Formato não permitido: ${mime}. Use JPG, PNG ou WebP.`, code: "INVALID_TYPE" }, 400);
  }

  // Validate size
  if (typeof fileSize === "number" && fileSize > MAX_SIZE_BYTES) {
    return c.json({
      success: false,
      error: `Imagem muito grande: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Máximo: 5MB.`,
      code: "TOO_LARGE",
    }, 400);
  }

  // Build key
  const validTypes = new Set(["product", "store-logo", "store-cover"]);
  const resolvedType = validTypes.has(uploadType ?? "") ? (uploadType as string) : "product";
  const key = generateKey(resolvedType, extFromMime(mime));

  // Para R2/S3: não precisamos de slot reservado.
  // Para memory: reservar slot para validar o PUT posterior.
  if (STORAGE_PROVIDER === "memory") {
    reserveSlot(key, mime, UPLOAD_TTL_MS);
  }

  const base        = getBaseUrl(c);
  const presignedUrl = `${base}/api/upload/data/${encodeURIComponent(key)}`;
  const imageUrl     = getPublicUrl(key, base);

  return c.json({ success: true, presignedUrl, imageUrl, key, provider: STORAGE_PROVIDER });
});

// ─── PUT (e POST) /api/upload/data/:key ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleDataUpload = async (c: Context<any>) => {
  const key = decodeURIComponent(c.req.param("key") ?? "");

  if (!key) {
    return c.json({ success: false, error: "Chave de upload inválida." }, 400);
  }

  // Para memory provider: verificar slot reservado
  if (STORAGE_PROVIDER === "memory" && !hasSlot(key)) {
    return c.json({ success: false, error: "Chave de upload inválida ou expirada." }, 400);
  }

  const arrayBuffer = await c.req.arrayBuffer().catch(() => null);
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return c.json({ success: false, error: "Corpo da requisição vazio." }, 400);
  }
  if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
    return c.json({ success: false, error: "Arquivo excede 5MB." }, 413);
  }

  // Detectar MIME do slot (memória) ou Content-Type da requisição
  let mime = c.req.header("Content-Type") ?? "image/jpeg";
  if (!ALLOWED_MIME.has(mime.toLowerCase())) mime = "image/jpeg";

  try {
    await putObject(key, Buffer.from(arrayBuffer), mime, UPLOAD_TTL_MS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno de armazenamento.";
    return c.json({ success: false, error: msg }, 503);
  }

  return new Response(null, { status: 200 });
};

uploadRoutes.put("/data/:key", handleDataUpload);
uploadRoutes.post("/data/:key", handleDataUpload);

// ─── GET /api/upload/serve ────────────────────────────────────────────────────
uploadRoutes.get("/serve", async (c) => {
  const key = c.req.query("key") ?? "";
  if (!key) return c.json({ error: "Parâmetro key ausente." }, 400);

  try {
    const obj = await getObject(key);
    if (!obj || obj.data.byteLength === 0) {
      return c.json({ error: "Imagem não encontrada ou expirada." }, 404);
    }
    return new Response(new Uint8Array(obj.data), {
      headers: {
        "Content-Type":   obj.mime,
        "Cache-Control":  "public, max-age=604800",
        "Content-Length": String(obj.data.byteLength),
      },
    });
  } catch {
    return c.json({ error: "Erro ao recuperar imagem." }, 503);
  }
});

// ─── GET /api/upload/health ───────────────────────────────────────────────────
uploadRoutes.get("/health", async (c) => {
  const h = await checkStorageHealth();
  return c.json({
    storage: {
      provider:    h.provider,
      configured:  h.configured,
      persistent:  h.persistent,
      memoryFallback: MEMORY_FALLBACK_ENABLED,
      warning:     h.warning,
    },
  });
});

// ─── GET /api/upload/presign stub ─────────────────────────────────────────────
uploadRoutes.get("/presign", (c) =>
  c.json({ success: false, error: "Use POST para solicitar upload." }, 405)
);
