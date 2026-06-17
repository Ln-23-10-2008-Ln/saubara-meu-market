/**
 * admin-routes.ts — endpoints /api/admin/*
 * Auth via HMAC-SHA256 token + smm_session cookie (admin role)
 */
import { Hono } from "hono";
import { db } from "../db/client";
import { users, sessions } from "../db/schema";
import { signHMAC, verifyHMAC, generateId } from "../services/auth-service";
import { getUserFromSession } from "./auth-routes";
import { eq, desc } from "drizzle-orm";

const admin = new Hono();

const HMAC_SECRET    = process.env.HMAC_SECRET    ?? process.env.SESSION_SECRET ?? "saubara_hmac_secret_dev";
const TOKEN_TTL_MS   = 8 * 60 * 60 * 1000; // 8h
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias

// ─── Admin token helpers ──────────────────────────────────────────────────────
async function createAdminToken(email: string): Promise<string> {
  const payload = `${email}:${Date.now()}`;
  const sig     = await signHMAC(payload, HMAC_SECRET);
  const b64     = btoa(payload);
  return `${b64}.${sig}`;
}

async function verifyAdminToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [b64, sig] = parts;
  const payload = atob(b64);
  const isValid = await verifyHMAC(payload, sig, HMAC_SECRET);
  if (!isValid) return { valid: false };

  const [email, tsStr] = payload.split(":");
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Date.now() - ts > TOKEN_TTL_MS) return { valid: false };
  return { valid: true, email };
}

// ─── Middleware: require admin (cookie session OR HMAC token) ─────────────────
async function requireAdmin(c: Parameters<Parameters<typeof admin.use>[1]>[0], next: () => Promise<void>) {
  // 1. Check session cookie (smm_session)
  const user = await getUserFromSession(c);
  if (user && user.role === "admin") {
    return next();
  }

  // 2. Check HMAC token from Authorization header
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (token) {
    const result = await verifyAdminToken(token);
    if (result.valid) return next();
  }

  return c.json({ success: false, error: "Acesso negado." }, 403);
}

// ─── POST /api/admin/login ────────────────────────────────────────────────────
admin.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ success: false, error: "E-mail e senha obrigatórios." }, 400);
  }

  // Find admin user in DB
  const adminUser = await db.select().from(users).where(eq(users.email, email)).get();
  if (!adminUser || adminUser.role !== "admin") {
    return c.json({ success: false, error: "Credenciais inválidas." }, 401);
  }

  // Verify password via Bun.password (argon2id)
  const PEPPER = process.env.PEPPER ?? "saubara_pepper_default_dev_only";
  const ok = await Bun.password.verify(password + PEPPER, adminUser.password_hash).catch(() => false);
  if (!ok) return c.json({ success: false, error: "Credenciais inválidas." }, 401);

  // Create smm_session cookie (same as regular login)
  const sessionId = generateId(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  const now       = new Date().toISOString();
  await db.insert(sessions).values({ id: sessionId, user_id: adminUser.id, expires_at: expiresAt, created_at: now });

  const isProd = process.env.NODE_ENV === "production";
  c.header(
    "Set-Cookie",
    `smm_session=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}${isProd ? "; Secure" : ""}`
  );

  // Also generate HMAC token for sessionStorage compatibility
  const token = await createAdminToken(email);

  return c.json({
    success: true,
    token,
    user: {
      id:    adminUser.id,
      email: adminUser.email,
      name:  adminUser.name,
      role:  adminUser.role,
    },
  });
});

// ─── GET/POST /api/admin/verify-token ────────────────────────────────────────
// Aceita GET (Authorization header) ou POST ({token} no body)
admin.get("/verify-token", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return c.json({ valid: false, success: false, error: "Token ausente." }, 401);
  const result = await verifyAdminToken(token);
  if (!result.valid) return c.json({ valid: false, success: false, error: "Token inválido ou expirado." }, 401);
  return c.json({ valid: true, success: true, email: result.email });
});

admin.post("/verify-token", async (c) => {
  // Frontend envia {token} no body
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const token = body.token ?? "";
  if (!token) return c.json({ valid: false, success: false, error: "Token ausente." }, 401);
  const result = await verifyAdminToken(token);
  if (!result.valid) return c.json({ valid: false, success: false, error: "Token inválido ou expirado." }, 401);
  return c.json({ valid: true, success: true, email: result.email });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
admin.get("/stats", requireAdmin, async (c) => {
  const allUsers = await db.select({
    id:                  users.id,
    name:                users.name,
    email:               users.email,
    role:                users.role,
    email_verified:      users.email_verified,
    approval_status:     users.approval_status,
    subscription_status: users.subscription_status,
    created_at:          users.created_at,
  }).from(users).all();

  const sellers   = allUsers.filter(u => u.role === "seller");
  const clients   = allUsers.filter(u => u.role === "client");
  const pending   = sellers.filter(u => u.approval_status === "pending");
  const approved  = sellers.filter(u => u.approval_status === "approved");
  const verified  = allUsers.filter(u => u.email_verified);
  const unverified = allUsers.filter(u => !u.email_verified);

  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const newToday = allUsers.filter(u => new Date(u.created_at) >= today);

  // recentUsers — últimos 10 cadastros, formato compatível com AdminUserStats
  const recentUsers = [...allUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(u => ({
      id:             u.id,
      name:           u.name,
      email:          u.email,
      type:           u.role === "seller" ? "seller" : "client",
      emailVerified:  u.email_verified,
      registeredAt:   u.created_at,
      approvalStatus: u.approval_status,
    }));

  const statsData = {
    // campos esperados por AdminUserStats (frontend)
    totalClients:    clients.length,
    totalSellers:    sellers.length,
    totalVerified:   verified.length,
    totalPending:    pending.length,
    totalUnverified: unverified.length,
    recentUsers,
    // campos extras de conveniência
    totalUsers:      allUsers.length,
    pendingSellers:  pending.length,
    approvedSellers: approved.length,
    newToday:        newToday.length,
    verifiedUsers:   verified.length,
  };

  return c.json({ success: true, data: statsData, stats: statsData });
});

// ─── GET /api/admin/metrics (alias de /stats) ────────────────────────────────
admin.get("/metrics", requireAdmin, async (c) => {
  // Redirecionar internamente para a mesma lógica de /stats
  const res = await fetch(new URL("/api/admin/stats", c.req.url).toString(), {
    headers: c.req.raw.headers,
  });
  const data = await res.json();
  return c.json(data);
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
admin.get("/users", requireAdmin, async (c) => {
  const role    = c.req.query("role");
  const search  = c.req.query("search");
  const page    = parseInt(c.req.query("page") ?? "1", 10);
  const limit   = parseInt(c.req.query("limit") ?? "50", 10);
  const offset  = (page - 1) * limit;

  let allUsers = await db.select().from(users).orderBy(desc(users.created_at)).all();

  if (role)   allUsers = allUsers.filter(u => u.role === role);
  if (search) {
    const q = search.toLowerCase();
    allUsers = allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.cpf ?? "").includes(q)
    );
  }

  const total   = allUsers.length;
  const pages   = Math.ceil(total / limit);
  const paged   = allUsers.slice(offset, offset + limit);

  // Mapear para camelCase + remover hash senha
  const mapUser = (u: typeof allUsers[0]) => ({
    id:                      u.id,
    name:                    u.name,
    email:                   u.email,
    phone:                   u.phone,
    cpf:                     u.cpf,
    role:                    u.role,
    emailVerified:           u.email_verified,
    phoneVerified:           u.phone_verified,
    approvalStatus:          u.approval_status,
    approvalNote:            u.approval_note,
    avatar:                  u.avatar,
    canSell:                 u.can_sell,
    canBuy:                  u.can_buy,
    storeName:               u.store_name,
    storeCategory:           u.store_category,
    storeWhatsapp:           u.store_whatsapp,
    storeBio:                u.store_bio,
    storeLogo:               u.store_logo,
    storeCover:              u.store_cover,
    storeHours:              u.store_hours,
    localidade:              u.store_localidade,
    subscriptionStatus:      u.subscription_status,
    registeredAt:            u.created_at,
    trialEndsAt:             u.subscription_trial_ends_at,
    expiresAt:               u.subscription_expires_at,
    createdAt:               u.created_at,
    updatedAt:               u.updated_at,
  });

  const mappedUsers = paged.map(mapUser);
  const sellers = mappedUsers.filter(u => u.role === "seller");
  const clients = mappedUsers.filter(u => u.role === "client");

  return c.json({
    success: true,
    // Formato antigo (direto) — para compatibilidade
    users: mappedUsers,
    total,
    page,
    limit,
    // Formato novo (dentro de data) — para fetchAdminUsers()
    data: {
      users:   mappedUsers,
      sellers: sellers,
      clients: clients,
      total,
      pages,
    },
  });
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
admin.get("/users/:id", requireAdmin, async (c) => {
  const id   = c.req.param("id");
  const user = await db.select().from(users).where(eq(users.id, id)).get();
  if (!user) return c.json({ success: false, error: "Usuário não encontrado." }, 404);
  return c.json({ success: true, user: { ...user, password_hash: undefined } });
});

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────
admin.patch("/users/:id", requireAdmin, async (c) => {
  const id   = c.req.param("id");
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

  const allowed = [
    "name", "email", "phone", "role",
    "email_verified", "phone_verified",
    "approval_status", "approval_note",
    "can_sell", "can_buy",
    "store_name", "store_category", "store_whatsapp",
    "store_bio", "store_logo", "store_cover",
    "store_hours", "store_localidade", "store_address",
    "subscription_status", "subscription_expires_at",
    "avatar",
    // camelCase aliases
    "emailVerified", "phoneVerified",
    "approvalStatus", "approvalNote",
    "canSell", "canBuy",
    "subscriptionStatus",
  ];

  // camelCase → snake_case mapping
  const camelToSnake: Record<string, string> = {
    emailVerified:      "email_verified",
    phoneVerified:      "phone_verified",
    approvalStatus:     "approval_status",
    approvalNote:       "approval_note",
    canSell:            "can_sell",
    canBuy:             "can_buy",
    subscriptionStatus: "subscription_status",
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) {
      const dbKey = camelToSnake[key] ?? key;
      updates[dbKey] = body[key];
    }
  }

  await db.update(users).set(updates as Parameters<typeof db.update>[0]["set"]).where(eq(users.id, id));
  const updated = await db.select().from(users).where(eq(users.id, id)).get();
  if (!updated) return c.json({ success: false, error: "Usuário não encontrado." }, 404);

  return c.json({ success: true, user: { ...updated, password_hash: undefined } });
});

export { admin as adminRoutes };
