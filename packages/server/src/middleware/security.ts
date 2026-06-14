/**
 * security.ts — headers de segurança globais + rate limiting + CORS
 */
import type { Context, MiddlewareHandler } from "hono";

// ─── Security Headers ─────────────────────────────────────────────────────────
export function applySecurityHeaders(c: Context): void {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://runable.site https://*.runable.site; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://api.resend.com https://*.turso.io; " +
    "frame-ancestors 'none';"
  );
}

// ─── In-memory rate limiter ───────────────────────────────────────────────────
interface RateEntry { count: number; resetAt: number }
const ratemap = new Map<string, RateEntry>();

export function rateLimit(max: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    const ip  = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    let entry = ratemap.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      ratemap.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      return c.json({ success: false, error: "Muitas tentativas. Tente novamente mais tarde." }, 429);
    }
    await next();
  };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4200",
  "https://saubarameumarket.com.br",
  "https://www.saubarameumarket.com.br",
  "https://presumptuous-postgraduate753.runable.site",
  "https://web-production-b5f2b1.up.railway.app",
];

function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Railway deploys: *.up.railway.app
  if (/^https:\/\/[a-zA-Z0-9-]+\.up\.railway\.app$/.test(origin)) return true;
  // Runable previews: *.runable.site
  if (/^https:\/\/[a-zA-Z0-9-]+\.runable\.site$/.test(origin)) return true;
  return false;
}

export function applyCORS(c: Context): void {
  const origin = c.req.header("origin") ?? "";
  if (isOriginAllowed(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
  }
  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  c.header("Access-Control-Allow-Credentials", "true");
}
