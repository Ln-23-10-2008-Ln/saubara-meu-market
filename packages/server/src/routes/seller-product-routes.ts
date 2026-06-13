/**
 * seller-product-routes.ts — CRUD de produtos do vendedor via Turso
 *
 * POST   /api/seller/products        — criar produto
 * GET    /api/seller/products        — listar produtos do vendedor autenticado
 * PATCH  /api/seller/products/:id    — editar produto
 * DELETE /api/seller/products/:id    — remover produto
 *
 * Requer sessão ativa (role=seller).
 */
import { Hono } from "hono";
import { db } from "../db/client";
import { products, users, sessions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { getCookie } from "hono/cookie";

const sellerProducts = new Hono();

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function requireSeller(c: import("hono").Context) {
  const sessionId = getCookie(c, "smm_session");
  if (!sessionId) return null;

  const session = await db
    .select({ user_id: sessions.user_id, expires_at: sessions.expires_at })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const user = await db
    .select({ id: users.id, role: users.role, store_name: users.store_name })
    .from(users)
    .where(eq(users.id, session.user_id))
    .get();

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;
  return user;
}

function generateId() {
  return `prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── GET /api/seller/products ─────────────────────────────────────────────────
sellerProducts.get("/", async (c) => {
  const user = await requireSeller(c);
  if (!user) return c.json({ success: false, error: "Não autorizado." }, 401);

  try {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.owner_id, user.id))
      .all();

    return c.json({ success: true, products: rows });
  } catch (e) {
    return c.json({ success: false, error: "Erro ao carregar produtos." }, 500);
  }
});

// ─── POST /api/seller/products ────────────────────────────────────────────────
sellerProducts.post("/", async (c) => {
  const user = await requireSeller(c);
  if (!user) return c.json({ success: false, error: "Não autorizado." }, 401);

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const { name, description, price, category, image_url, unit, stock, available, featured } = body;

  if (!name || price === undefined) {
    return c.json({ success: false, error: "name e price são obrigatórios." }, 400);
  }

  const now      = new Date().toISOString();
  const storeId  = `merchant-${user.id}`;
  const id       = generateId();

  try {
    await db.insert(products).values({
      id,
      store_id:    storeId,
      owner_id:    user.id,
      name:        String(name),
      description: description ? String(description) : null,
      price:       String(price),
      category:    category ? String(category) : null,
      image_url:   image_url ? String(image_url) : null,
      unit:        unit ? String(unit) : null,
      stock:       typeof stock === "number" ? stock : 0,
      available:   available !== false,
      featured:    featured === true,
      sales:       0,
      created_at:  now,
      updated_at:  now,
    });

    return c.json({ success: true, id });
  } catch (e) {
    return c.json({ success: false, error: "Erro ao criar produto." }, 500);
  }
});

// ─── PATCH /api/seller/products/:id ──────────────────────────────────────────
sellerProducts.patch("/:id", async (c) => {
  const user = await requireSeller(c);
  if (!user) return c.json({ success: false, error: "Não autorizado." }, 401);

  const productId = c.req.param("id");
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

  // Verificar ownership
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.owner_id, user.id)))
    .get();

  if (!existing) return c.json({ success: false, error: "Produto não encontrado." }, 404);

  const allowed: Record<string, unknown> = {};
  if (body.name        !== undefined) allowed.name        = String(body.name);
  if (body.description !== undefined) allowed.description = body.description ? String(body.description) : null;
  if (body.price       !== undefined) allowed.price       = String(body.price);
  if (body.category    !== undefined) allowed.category    = body.category ? String(body.category) : null;
  if (body.image_url   !== undefined) allowed.image_url   = body.image_url ? String(body.image_url) : null;
  if (body.unit        !== undefined) allowed.unit        = body.unit ? String(body.unit) : null;
  if (body.stock       !== undefined) allowed.stock       = Number(body.stock);
  if (body.available   !== undefined) allowed.available   = body.available !== false;
  if (body.featured    !== undefined) allowed.featured    = body.featured === true;
  allowed.updated_at = new Date().toISOString();

  try {
    await db.update(products).set(allowed).where(eq(products.id, productId));
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Erro ao atualizar produto." }, 500);
  }
});

// ─── DELETE /api/seller/products/:id ─────────────────────────────────────────
sellerProducts.delete("/:id", async (c) => {
  const user = await requireSeller(c);
  if (!user) return c.json({ success: false, error: "Não autorizado." }, 401);

  const productId = c.req.param("id");

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.owner_id, user.id)))
    .get();

  if (!existing) return c.json({ success: false, error: "Produto não encontrado." }, 404);

  try {
    await db.delete(products).where(eq(products.id, productId));
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Erro ao remover produto." }, 500);
  }
});

export { sellerProducts };
