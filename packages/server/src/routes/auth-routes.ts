/**
 * auth-routes.ts — 11 endpoints /api/auth/*
 * S2.1 — argon2id + cookie HttpOnly smm_session
 */
import { Hono } from "hono";
import { db } from "../db/client";
import { users, sessions } from "../db/schema";
import {
  hashPasswordArgon2,
  verifyPasswordArgon2,
  generateId,
  generateCode,
} from "../services/auth-service";
import { sendVerifyEmail, sendResetEmail } from "../services/email-service";
import { eq, or } from "drizzle-orm";
import { rateLimit } from "../middleware/security";

const auth = new Hono();

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const CODE_TTL_MS     = 30 * 60 * 1000;    // 30 minutes

// ─── Helper: set session cookie ───────────────────────────────────────────────
function setSessionCookie(c: Parameters<Parameters<typeof auth.use>[1]>[0], sessionId: string) {
  const isProd = process.env.NODE_ENV === "production";
  c.header(
    "Set-Cookie",
    `smm_session=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}${isProd ? "; Secure" : ""}`
  );
}

function clearSessionCookie(c: Parameters<Parameters<typeof auth.use>[1]>[0]) {
  c.header("Set-Cookie", "smm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
}

// ─── Helper: get user from session ───────────────────────────────────────────
async function getUserFromSession(c: Parameters<Parameters<typeof auth.use>[1]>[0]) {
  const cookie = c.req.header("cookie") ?? "";
  const match  = cookie.match(/smm_session=([^;]+)/);
  if (!match) return null;
  const sessionId = match[1];

  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  const user = await db.select().from(users).where(eq(users.id, session.user_id)).get();
  return user ?? null;
}

// ─── mapUser: snake_case → camelCase for frontend ────────────────────────────
function mapUser(u: typeof users.$inferSelect) {
  return {
    id:                         u.id,
    cpf:                        u.cpf,
    name:                       u.name,
    email:                      u.email,
    phone:                      u.phone,
    role:                       u.role,
    can_sell:                   u.can_sell,
    can_buy:                    u.can_buy,
    email_verified:             u.email_verified,
    phone_verified:             u.phone_verified,
    verify_method:              u.verify_method,
    approval_status:            u.approval_status,
    approval_note:              u.approval_note,
    avatar:                     u.avatar,
    address_json:               u.address_json,
    store_name:                 u.store_name,
    store_category:             u.store_category,
    store_whatsapp:             u.store_whatsapp,
    store_bio:                  u.store_bio,
    store_logo:                 u.store_logo,
    store_cover:                u.store_cover,
    store_hours:                u.store_hours,
    store_localidade:           u.store_localidade,
    store_address:              u.store_address,
    service_area_json:          u.service_area_json,
    delivery_config_json:       u.delivery_config_json,
    delivery_rates_json:        u.delivery_rates_json,
    subscription_status:        u.subscription_status,
    subscription_registered_at: u.subscription_registered_at,
    subscription_trial_ends_at: u.subscription_trial_ends_at,
    subscription_expires_at:    u.subscription_expires_at,
    photo_responsavel:          u.photo_responsavel,
    logo_loja:                  u.logo_loja,
    foto_fachada:               u.foto_fachada,
    created_at:                 u.created_at,
    updated_at:                 u.updated_at,
  };
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
auth.get("/me", async (c) => {
  const user = await getUserFromSession(c);
  if (!user) return c.json({ success: false, error: "Não autenticado." }, 401);
  return c.json({ success: true, user: mapUser(user) });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
auth.post("/login", rateLimit(10, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const { emailOrPhone, password } = body;

  if (!emailOrPhone || !password) {
    return c.json({ success: false, error: "E-mail/telefone e senha são obrigatórios." }, 400);
  }

  const user = await db
    .select()
    .from(users)
    .where(or(eq(users.email, emailOrPhone), eq(users.phone, emailOrPhone)))
    .get();

  if (!user) return c.json({ success: false, error: "Credenciais inválidas." }, 401);

  const ok = await verifyPasswordArgon2(password, user.password_hash);
  if (!ok) return c.json({ success: false, error: "Credenciais inválidas." }, 401);

  // Only sellers need email verification
  if (user.role === "seller" && !user.email_verified) {
    return c.json({ success: false, error: "E-mail não verificado.", requireVerify: true }, 403);
  }

  // Create session
  const sessionId  = generateId(32);
  const expiresAt  = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  const now        = new Date().toISOString();
  await db.insert(sessions).values({ id: sessionId, user_id: user.id, expires_at: expiresAt, created_at: now });

  setSessionCookie(c, sessionId);
  return c.json({ success: true, user: mapUser(user) });
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
auth.post("/register", rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const {
    name, email, cpf, phone, password,
    // BUG-R1 fix: accept both field names from frontend
    type, userType,
    // BUG-R2 fix: store fields
    storeName, storeCategory, storeWhatsapp, storeBio,
    storeHours, storeAddress, storeLocalidade,
    storeLogo, storeCover, logoLoja, fotoFachada, photoResponsavel,
  } = body;

  if (!name || !email || !cpf || !password) {
    return c.json({ success: false, error: "Campos obrigatórios: nome, e-mail, CPF, senha." }, 400);
  }

  // BUG-R1 fix: check both `type` and `userType` (frontend sends `type:"seller"`)
  const resolvedType = type ?? userType ?? "client";

  // Check duplicates
  const existing = await db
    .select({ id: users.id, cpf: users.cpf, email: users.email })
    .from(users)
    .where(or(eq(users.email, email), eq(users.cpf, cpf)))
    .get();

  if (existing) {
    if (existing.email === email) return c.json({ success: false, error: "E-mail já cadastrado." }, 409);
    if (existing.cpf   === cpf)   return c.json({ success: false, error: "CPF já cadastrado." }, 409);
  }

  const passwordHash = await hashPasswordArgon2(password);
  const id           = generateId();
  const now          = new Date().toISOString();
  const verifyCode   = generateCode(6);
  const verifyExpiry = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const role         = resolvedType === "seller" ? "seller" : "client";

  // Subscription for sellers
  const trialEndsAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expiresAt    = trialEndsAt;

  // BUG-R2 fix: resolve store fields from all possible frontend field names
  const resolvedStoreName       = storeName     ?? null;
  const resolvedStoreCategory   = storeCategory ?? null;
  const resolvedStoreWhatsapp   = storeWhatsapp ?? null;
  const resolvedStoreBio        = storeBio      ?? null;
  const resolvedStoreHours      = storeHours    ?? null;
  const resolvedStoreAddress    = storeAddress  ?? null;
  const resolvedStoreLocalidade = storeLocalidade ?? null;
  const resolvedStoreLogo       = storeLogo ?? logoLoja ?? null;
  const resolvedStoreCover      = storeCover ?? fotoFachada ?? null;
  const resolvedPhotoResp       = photoResponsavel ?? null;

  await db.insert(users).values({
    id,
    cpf,
    name,
    email,
    phone:                       phone ?? null,
    role,
    password_hash:               passwordHash,
    email_verified:              false,
    phone_verified:              false,
    verify_method:               "email",
    verify_code:                 verifyCode,
    verify_code_expires:         verifyExpiry,
    can_sell:                    role === "seller",
    can_buy:                     role === "client",
    approval_status:             role === "seller" ? "pending" : null,
    subscription_status:         role === "seller" ? "trial" : null,
    subscription_registered_at:  role === "seller" ? now : null,
    subscription_trial_ends_at:  role === "seller" ? trialEndsAt : null,
    subscription_expires_at:     role === "seller" ? expiresAt : null,
    // BUG-R2 fix: store fields saved at registration
    store_name:                  role === "seller" ? resolvedStoreName : null,
    store_category:              role === "seller" ? resolvedStoreCategory : null,
    store_whatsapp:              role === "seller" ? resolvedStoreWhatsapp : null,
    store_bio:                   role === "seller" ? resolvedStoreBio : null,
    store_hours:                 role === "seller" ? resolvedStoreHours : null,
    store_address:               role === "seller" ? resolvedStoreAddress : null,
    store_localidade:            role === "seller" ? resolvedStoreLocalidade : null,
    store_logo:                  role === "seller" ? resolvedStoreLogo : null,
    store_cover:                 role === "seller" ? resolvedStoreCover : null,
    photo_responsavel:           role === "seller" ? resolvedPhotoResp : null,
    created_at:                  now,
    updated_at:                  now,
  });

  // Send verify email ONLY to sellers
  if (role === "seller") {
    await sendVerifyEmail(email, name, verifyCode);
  }

  const newUser = await db.select().from(users).where(eq(users.id, id)).get();
  return c.json({ success: true, user: mapUser(newUser!), requireVerify: true }, 201);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
auth.post("/logout", async (c) => {
  const cookie = c.req.header("cookie") ?? "";
  const match  = cookie.match(/smm_session=([^;]+)/);
  if (match) {
    await db.delete(sessions).where(eq(sessions.id, match[1]));
  }
  clearSessionCookie(c);
  return c.json({ success: true });
});

// ─── POST /api/auth/verify-email ──────────────────────────────────────────────
auth.post("/verify-email", rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const { email, code } = body;
  if (!email || !code) return c.json({ success: false, error: "E-mail e código são obrigatórios." }, 400);

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return c.json({ success: false, error: "Usuário não encontrado." }, 404);
  if (user.email_verified) return c.json({ success: true, alreadyVerified: true });

  if (user.verify_code !== code) return c.json({ success: false, error: "Código inválido." }, 400);
  if (!user.verify_code_expires || new Date(user.verify_code_expires) < new Date()) {
    return c.json({ success: false, error: "Código expirado." }, 400);
  }

  const now = new Date().toISOString();
  await db.update(users).set({ email_verified: true, verify_code: null, verify_code_expires: null, updated_at: now }).where(eq(users.id, user.id));

  // Auto-login after verify
  const sessionId = generateId(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await db.insert(sessions).values({ id: sessionId, user_id: user.id, expires_at: expiresAt, created_at: now });
  setSessionCookie(c, sessionId);

  const updated = await db.select().from(users).where(eq(users.id, user.id)).get();
  return c.json({ success: true, user: mapUser(updated!) });
});

// ─── POST /api/auth/resend-verify ────────────────────────────────────────────
auth.post("/resend-verify", rateLimit(3, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const { email } = body;
  if (!email) return c.json({ success: false, error: "E-mail obrigatório." }, 400);

  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return c.json({ success: false, error: "Usuário não encontrado." }, 404);
  if (user.email_verified) return c.json({ success: false, error: "E-mail já verificado." }, 400);

  const newCode   = generateCode(6);
  const newExpiry = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await db.update(users).set({ verify_code: newCode, verify_code_expires: newExpiry, updated_at: new Date().toISOString() }).where(eq(users.id, user.id));
  await sendVerifyEmail(email, user.name, newCode);

  return c.json({ success: true });
});

// ─── POST /api/auth/request-reset ────────────────────────────────────────────
auth.post("/request-reset", rateLimit(3, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  // BUG-R3 fix: accept both `email` and `emailOrPhone` from frontend
  const rawIdentifier = body.emailOrPhone ?? body.email ?? "";
  if (!rawIdentifier) return c.json({ success: false, error: "E-mail obrigatório." }, 400);

  const user = await db.select().from(users).where(eq(users.email, rawIdentifier)).get();
  // Always return success to prevent user enumeration
  if (!user) return c.json({ success: true });

  const code   = generateCode(6);
  const expiry = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await db.update(users).set({ reset_code: code, reset_code_expires: expiry, updated_at: new Date().toISOString() }).where(eq(users.id, user.id));
  await sendResetEmail(rawIdentifier, user.name, code);

  return c.json({ success: true });
});

// ─── POST /api/auth/validate-code ─────────────────────────────────────────────
auth.post("/validate-code", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  // BUG-R3 fix: accept both field names
  const identifier = body.emailOrPhone ?? body.email ?? "";
  const { code } = body;
  if (!identifier || !code) return c.json({ success: false, error: "E-mail e código são obrigatórios." }, 400);

  const user = await db.select().from(users).where(eq(users.email, identifier)).get();
  if (!user || user.reset_code !== code) return c.json({ success: false, error: "Código inválido." }, 400);
  if (!user.reset_code_expires || new Date(user.reset_code_expires) < new Date()) {
    return c.json({ success: false, error: "Código expirado." }, 400);
  }
  return c.json({ success: true });
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
auth.post("/reset-password", rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  // BUG-R3 fix: accept both field names
  const identifier = body.emailOrPhone ?? body.email ?? "";
  const { code, newPassword } = body;
  if (!identifier || !code || !newPassword) return c.json({ success: false, error: "Campos obrigatórios ausentes." }, 400);

  const user = await db.select().from(users).where(eq(users.email, identifier)).get();
  if (!user || user.reset_code !== code) return c.json({ success: false, error: "Código inválido." }, 400);
  if (!user.reset_code_expires || new Date(user.reset_code_expires) < new Date()) {
    return c.json({ success: false, error: "Código expirado." }, 400);
  }

  const newHash = await hashPasswordArgon2(newPassword);
  await db.update(users).set({ password_hash: newHash, reset_code: null, reset_code_expires: null, updated_at: new Date().toISOString() }).where(eq(users.id, user.id));
  // Invalidate all sessions
  await db.delete(sessions).where(eq(sessions.user_id, user.id));

  return c.json({ success: true });
});

// ─── POST /api/auth/send-verify-email ─────────────────────────────────────────
auth.post("/send-verify-email", rateLimit(3, 60_000), async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const { email, name, code } = body;
  if (!email || !name || !code) return c.json({ success: false, error: "Parâmetros ausentes." }, 400);
  const result = await sendVerifyEmail(email, name, code);
  return c.json(result);
});

// ─── POST /api/auth/send-reset-email ──────────────────────────────────────────
auth.post("/send-reset-email", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, string>;
  const { email, name, code } = body;
  if (!email || !name || !code) return c.json({ success: false, error: "Parâmetros ausentes." }, 400);
  const result = await sendResetEmail(email, name, code);
  return c.json(result);
});

// ─── PATCH /api/auth/me — atualiza perfil do usuário autenticado ──────────────
auth.patch("/me", async (c) => {
  const user = await getUserFromSession(c);
  if (!user) return c.json({ success: false, error: "Não autenticado." }, 401);

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

  const allowed = [
    "name", "phone", "avatar", "address_json",
    "store_name", "store_category", "store_whatsapp", "store_bio",
    "store_logo", "store_cover", "store_hours", "store_localidade", "store_address",
    "service_area_json", "delivery_config_json", "delivery_rates_json",
    // camelCase aliases
    "storeName", "storeCategory", "storeWhatsapp", "storeBio",
    "storeLogo", "storeCover", "storeHours", "storeLocalidade", "storeAddress",
    "deliveryConfig", "deliveryRates", "serviceArea",
  ];

  const camelToSnake: Record<string, string> = {
    storeName:      "store_name",
    storeCategory:  "store_category",
    storeWhatsapp:  "store_whatsapp",
    storeBio:       "store_bio",
    storeLogo:      "store_logo",
    storeCover:     "store_cover",
    storeHours:     "store_hours",
    storeLocalidade: "store_localidade",
    storeAddress:   "store_address",
    deliveryConfig: "delivery_config_json",
    deliveryRates:  "delivery_rates_json",
    serviceArea:    "service_area_json",
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) {
      const dbKey = camelToSnake[key] ?? key;
      // Serialize objects to JSON strings
      const val = body[key];
      updates[dbKey] = (val !== null && typeof val === "object") ? JSON.stringify(val) : val;
    }
  }

  await db.update(users).set(updates as Parameters<typeof db.update>[0]["set"]).where(eq(users.id, user.id));
  const updated = await db.select().from(users).where(eq(users.id, user.id)).get();
  if (!updated) return c.json({ success: false, error: "Usuário não encontrado." }, 404);

  return c.json({ success: true, user: mapUser(updated) });
});

export { auth as authRoutes, getUserFromSession };
