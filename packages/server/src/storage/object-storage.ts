/**
 * object-storage.ts — Camada de armazenamento de objetos com suporte a R2/S3
 *
 * Estratégia:
 *   - Se R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET estiverem
 *     definidos → usa Cloudflare R2 via S3-compatible API
 *   - Se S3_BUCKET + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY estiverem definidos → usa AWS S3
 *   - Caso contrário → REJEITA o upload com erro claro (sem fallback em memória em produção)
 *
 * O flag ALLOW_MEMORY_FALLBACK=true (dev only) re-habilita o Map em memória para
 * desenvolvimento local sem credenciais R2/S3.
 */

export type StorageProvider = "r2" | "s3" | "memory";

export interface StorageObject {
  key:       string;
  data:      Buffer;
  mime:      string;
  expiresAt: number;
}

// ─── Determine active provider ─────────────────────────────────────────────────

function detectProvider(): StorageProvider {
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  ) return "r2";

  if (
    process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  ) return "s3";

  return "memory";
}

export const STORAGE_PROVIDER: StorageProvider = detectProvider();
export const MEMORY_FALLBACK_ENABLED =
  process.env.ALLOW_MEMORY_FALLBACK === "true" || process.env.NODE_ENV !== "production";

// ─── In-memory fallback (dev only) ────────────────────────────────────────────

const memoryStore = new Map<string, StorageObject>();

if (MEMORY_FALLBACK_ENABLED && STORAGE_PROVIDER === "memory") {
  // Cleanup expired every hour
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (v.expiresAt < now) memoryStore.delete(k);
    }
  }, 60 * 60 * 1000);
}

// ─── S3/R2 fetch helper ────────────────────────────────────────────────────────

function buildS3Endpoint(): string {
  if (STORAGE_PROVIDER === "r2") {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  const region = process.env.AWS_REGION ?? "us-east-1";
  return `https://s3.${region}.amazonaws.com`;
}

function buildBucket(): string {
  if (STORAGE_PROVIDER === "r2") return process.env.R2_BUCKET!;
  return process.env.S3_BUCKET!;
}

async function getS3AuthHeaders(
  method: string,
  bucket: string,
  key: string,
  contentType: string,
  body: ArrayBuffer | null
): Promise<Record<string, string>> {
  const accessKey =
    STORAGE_PROVIDER === "r2"
      ? process.env.R2_ACCESS_KEY_ID!
      : process.env.AWS_ACCESS_KEY_ID!;
  const secretKey =
    STORAGE_PROVIDER === "r2"
      ? process.env.R2_SECRET_ACCESS_KEY!
      : process.env.AWS_SECRET_ACCESS_KEY!;
  const region = STORAGE_PROVIDER === "r2" ? "auto" : (process.env.AWS_REGION ?? "us-east-1");

  const now = new Date();
  const dateShort = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const dateTime  = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"; // YYYYMMDDTHHmmssZ

  const endpoint = buildS3Endpoint();
  const host = new URL(`${endpoint}/${bucket}/${key}`).host;

  // Hash payload
  const payloadBuffer = body ?? new ArrayBuffer(0);
  const payloadHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", payloadBuffer))
  ).map(b => b.toString(16).padStart(2, "0")).join("");

  // Canonical request
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${dateTime}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalUri  = `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const canonicalRequest = [
    method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash
  ].join("\n");

  // String to sign
  const canonicalHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)))
  ).map(b => b.toString(16).padStart(2, "0")).join("");

  const credentialScope = `${dateShort}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${dateTime}\n${credentialScope}\n${canonicalHash}`;

  // Signing key
  async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  }
  const kDate    = await hmac(new TextEncoder().encode(`AWS4${secretKey}`) as unknown as ArrayBuffer, dateShort);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const sig      = Array.from(
    new Uint8Array(await hmac(kSigning, stringToSign))
  ).map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    "Content-Type":         contentType,
    "x-amz-date":           dateTime,
    "x-amz-content-sha256": payloadHash,
    "Authorization": `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Faz upload de um objeto para R2/S3 (ou memory em dev).
 * Em produção com STORAGE_PROVIDER=memory e ALLOW_MEMORY_FALLBACK=false → lança erro.
 */
export async function putObject(
  key: string,
  data: Buffer,
  mime: string,
  ttlMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<void> {
  if (STORAGE_PROVIDER === "memory") {
    if (!MEMORY_FALLBACK_ENABLED) {
      throw new Error(
        "Armazenamento persistente não configurado. Configure R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET ou S3_BUCKET/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY."
      );
    }
    memoryStore.set(key, { key, data, mime, expiresAt: Date.now() + ttlMs });
    return;
  }

  const endpoint = buildS3Endpoint();
  const bucket   = buildBucket();
  const url      = `${endpoint}/${bucket}/${key}`;
  const ab       = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

  const headers = await getS3AuthHeaders("PUT", bucket, key, mime, ab);
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Length": String(data.byteLength) },
    body: ab,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2/S3 PUT falhou (${res.status}): ${text.slice(0, 200)}`);
  }
}

/**
 * Recupera um objeto por chave. Retorna null se não encontrado.
 */
export async function getObject(key: string): Promise<{ data: Buffer; mime: string } | null> {
  if (STORAGE_PROVIDER === "memory") {
    if (!MEMORY_FALLBACK_ENABLED) return null;
    const obj = memoryStore.get(key);
    if (!obj || obj.expiresAt < Date.now()) {
      if (obj) memoryStore.delete(key);
      return null;
    }
    return { data: obj.data, mime: obj.mime };
  }

  const endpoint = buildS3Endpoint();
  const bucket   = buildBucket();
  const url      = `${endpoint}/${bucket}/${key}`;
  const headers  = await getS3AuthHeaders("GET", bucket, key, "application/octet-stream", null);

  const res = await fetch(url, { method: "GET", headers });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const ab   = await res.arrayBuffer();
  const mime = res.headers.get("Content-Type") ?? "application/octet-stream";
  return { data: Buffer.from(ab), mime };
}

/**
 * Verifica se o provider de armazenamento está configurado e operacional.
 */
export async function checkStorageHealth(): Promise<{
  provider: StorageProvider;
  configured: boolean;
  persistent: boolean;
  warning?: string;
}> {
  if (STORAGE_PROVIDER !== "memory") {
    return {
      provider:   STORAGE_PROVIDER,
      configured: true,
      persistent: true,
    };
  }

  const warning = MEMORY_FALLBACK_ENABLED
    ? "Armazenamento em memória (dev only) — imagens perdidas ao reiniciar o servidor. Configure R2/S3 para produção."
    : "Armazenamento persistente NÃO configurado. Uploads desabilitados em produção.";

  return {
    provider:   "memory",
    configured: MEMORY_FALLBACK_ENABLED,
    persistent: false,
    warning,
  };
}

/**
 * Retorna a URL pública de um objeto.
 * Para R2 com domínio customizado, usar R2_PUBLIC_URL.
 * Para S3, usar bucket público ou presigned URL.
 * Para memory, usa o proxy local /api/upload/serve.
 */
export function getPublicUrl(key: string, baseUrl: string): string {
  if (STORAGE_PROVIDER === "r2" && process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  if (STORAGE_PROVIDER === "s3" && process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  // Fallback: proxy local (dev ou produção sem CDN)
  return `${baseUrl}/api/upload/serve?key=${encodeURIComponent(key)}`;
}

/** Reserva um slot de upload (necessário para validar o PUT posterior) */
export function reserveSlot(key: string, mime: string, ttlMs: number): void {
  if (STORAGE_PROVIDER === "memory") {
    memoryStore.set(key, {
      key,
      data: Buffer.alloc(0),
      mime,
      expiresAt: Date.now() + ttlMs,
    });
  }
  // Para R2/S3: slot reservado implicitamente via chave gerada; PUT direto não precisa de slot
}

/** Verifica se uma chave tem slot reservado (para memória) */
export function hasSlot(key: string): boolean {
  if (STORAGE_PROVIDER === "memory") {
    return memoryStore.has(key);
  }
  return true; // R2/S3: sempre aceita PUT (validação no presign)
}
