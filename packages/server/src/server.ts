/**
 * server.ts — Saubara Meu Market · Hono Backend
 * Porta: 3000 (Bun)
 * Frontend: Vite proxy em 4200 → 3000/api
 */
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { authRoutes } from "./routes/auth-routes";
import { adminRoutes } from "./routes/admin-routes";
import { productRoutes } from "./routes/product-routes";
import { storeRoutes } from "./routes/store-routes";
import { uploadRoutes } from "./routes/upload-routes";
import { sellerProducts } from "./routes/seller-product-routes";
import { orderRoutes } from "./routes/order-routes";
import { applySecurityHeaders, applyCORS } from "./middleware/security";
import { libsql } from "./db/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const app = new Hono();
const IS_PROD = process.env.NODE_ENV === "production";
const DIST    = join(import.meta.dir, "..", "..", "..", "dist");

// ─── Global middleware ────────────────────────────────────────────────────────
app.use("*", async (c, next) => {
  applySecurityHeaders(c);
  applyCORS(c);
  if (c.req.method === "OPTIONS") {
    return c.text("", 204);
  }
  await next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => {
  const emailConfigured = !!(process.env.RESEND_API_KEY);
  return c.json({ status: "ok", emailConfigured });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.route("/api/auth",     authRoutes);
app.route("/api/admin",    adminRoutes);
app.route("/api/products", productRoutes);
app.route("/api/stores",   storeRoutes);
app.route("/api/upload",        uploadRoutes);
app.route("/api/seller/products", sellerProducts);
app.route("/api/orders",          orderRoutes);

// ─── Static assets (produção) ─────────────────────────────────────────────────
if (IS_PROD && existsSync(DIST)) {
  // Block source maps explicitly (defense-in-depth: build already has sourcemap:false)
  app.use("*", async (c, next) => {
    if (c.req.path.endsWith(".map")) return c.text("Not found", 404);
    await next();
  });

  app.use("/assets/*", serveStatic({ root: DIST }));
  app.use("/favicon.ico", serveStatic({ root: DIST }));
  app.use("/logo.svg",    serveStatic({ root: DIST }));

  // SPA fallback
  app.get("*", (c) => {
    const indexPath = join(DIST, "index.html");
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, "utf-8");
      return c.html(html);
    }
    return c.text("Not found", 404);
  });
} else if (!IS_PROD) {
  // Dev: serve favicon + logo from public dir
  const PUBLIC = join(import.meta.dir, "..", "..", "..", "public");
  if (existsSync(PUBLIC)) {
    app.use("/favicon.ico", serveStatic({ root: PUBLIC }));
    app.use("/logo.svg",    serveStatic({ root: PUBLIC }));
  }
}

// ─── Turso keep-alive (evita ECONNRESET em conexões idle) ────────────────────
// Turso fecha conexões WebSocket ociosas após ~4 min.
// Um ping a cada 3 min mantém a conexão viva e evita 500 no primeiro request.
setInterval(async () => {
  try {
    await libsql.execute("SELECT 1");
  } catch {
    // reconecta silenciosamente na próxima query real
  }
}, 3 * 60 * 1000);

// ─── Start ────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3000", 10);
console.log(`🌱 Saubara Meu Market — servidor na porta ${port}`);
console.log(`   Ambiente: ${IS_PROD ? "produção" : "desenvolvimento"}`);
console.log(`   Banco: ${process.env.TURSO_DATABASE_URL ? "✅ Turso conectado" : "❌ TURSO_DATABASE_URL ausente"}`);
console.log(`   Email: ${process.env.RESEND_API_KEY ? "✅ Resend configurado" : "⚠️ modo simulado"}`);

export default {
  port,
  fetch: app.fetch,
};
// v1.1-cors-fix Sun Jun 14 08:44:06 UTC 2026
