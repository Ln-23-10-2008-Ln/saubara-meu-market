/**
 * order-routes.ts — /api/orders
 * Turso-first order CRUD. Replaces localStorage smm_orders.
 *
 * POST   /api/orders               — criar pedido
 * GET    /api/orders               — listar (filtros: clientId, storeId, status)
 * GET    /api/orders/:id           — detalhe
 * PATCH  /api/orders/:id/status    — atualizar status
 */
import { Hono } from "hono";
import { db } from "../db/client";
import { orders, sessions, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { getCookie } from "hono/cookie";

const route = new Hono();

// ─── POST /api/orders ─────────────────────────────────────────────────────────
route.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      clientId, clientName,
      storeId, storeName, storeWhatsapp,
      items,
      subtotal, deliveryFee, total,
      localidade, address, notes,
    } = body;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: "storeId e items são obrigatórios." }, 400);
    }
    if (!total) {
      return c.json({ error: "total é obrigatório." }, 400);
    }

    const now = new Date().toISOString();
    const id  = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    await db.insert(orders).values({
      id,
      client_id:      clientId     ?? null,
      client_name:    clientName   ?? null,
      store_id:       storeId,
      store_name:     storeName    ?? null,
      store_whatsapp: storeWhatsapp ?? null,
      items_json:     JSON.stringify(items),
      subtotal:       String(subtotal ?? 0),
      delivery_fee:   String(deliveryFee ?? 0),
      total:          String(total),
      localidade:     localidade   ?? null,
      address:        address      ?? null,
      notes:          notes        ?? null,
      status:         "pending",
      created_at:     now,
      updated_at:     now,
    });

    return c.json({ id, status: "pending", createdAt: now }, 201);
  } catch (err: any) {
    console.error("[order-routes] POST /:", err);
    return c.json({ error: "Erro ao criar pedido." }, 500);
  }
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
route.get("/", async (c) => {
  try {
    const storeId  = c.req.query("storeId");
    const clientId = c.req.query("clientId");
    const status   = c.req.query("status");
    const limit    = Math.min(parseInt(c.req.query("limit")  ?? "50",  10), 200);
    const offset   = parseInt(c.req.query("offset") ?? "0", 10);

    let rows = await db.select().from(orders).orderBy(desc(orders.created_at));

    if (storeId)  rows = rows.filter((o: any) => o.store_id  === storeId);
    if (clientId) rows = rows.filter((o: any) => o.client_id === clientId);
    if (status)   rows = rows.filter((o: any) => o.status    === status);

    const total  = rows.length;
    const paged  = rows.slice(offset, offset + limit);

    const result = paged.map((o: any) => ({
      ...o,
      items: (() => { try { return JSON.parse(o.items_json); } catch { return []; } })(),
    }));

    return c.json({ orders: result, total, limit, offset });
  } catch (err: any) {
    console.error("[order-routes] GET /:", err);
    return c.json({ error: "Erro ao buscar pedidos." }, 500);
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
route.get("/:id", async (c) => {
  try {
    const id  = c.req.param("id");
    const row = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!row.length) return c.json({ error: "Pedido não encontrado." }, 404);

    const o = row[0];
    return c.json({
      ...o,
      items: (() => { try { return JSON.parse(o.items_json); } catch { return []; } })(),
    });
  } catch (err: any) {
    console.error("[order-routes] GET /:id:", err);
    return c.json({ error: "Erro ao buscar pedido." }, 500);
  }
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
route.patch("/:id/status", async (c) => {
  try {
    const id   = c.req.param("id");
    const body = await c.req.json();
    const { status } = body;

    const VALID = ["pending", "confirmed", "preparing", "out_delivery", "delivered", "cancelled"];
    if (!status || !VALID.includes(status)) {
      return c.json({ error: `Status inválido. Use: ${VALID.join(", ")}` }, 400);
    }

    const existing = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!existing.length) return c.json({ error: "Pedido não encontrado." }, 404);

    const now = new Date().toISOString();
    await db.update(orders).set({ status, updated_at: now }).where(eq(orders.id, id));

    return c.json({ id, status, updatedAt: now });
  } catch (err: any) {
    console.error("[order-routes] PATCH /:id/status:", err);
    return c.json({ error: "Erro ao atualizar status." }, 500);
  }
});

export { route as orderRoutes };
