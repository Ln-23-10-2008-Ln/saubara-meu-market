/**
 * auth.tsx — Saubara Meu Market · S2.2
 * ─────────────────────────────────────────────────────────────────────────────
 * Estratégia dual-write:
 *   - Turso (cookie HttpOnly smm_session via backend) = fonte PRINCIPAL
 *   - localStorage = fallback legado / offline
 *
 * Fluxo:
 *   init:     GET /api/auth/me → fallback localStorage
 *   login:    POST /api/auth/login → fallback localStorage
 *   register: POST /api/auth/register → dual-write localStorage (módulos legados)
 *   logout:   POST /api/auth/logout + localStorage.removeItem
 *   verify:   POST /api/auth/verify-email → fallback localStorage
 *   resend:   POST /api/auth/resend-verify → fallback localStorage
 *   reset:    POST /api/auth/request-reset|validate-code|reset-password → fallback
 *
 * Restrições S2.2:
 *   - NÃO altera checkout
 *   - NÃO altera painel admin
 *   - NÃO altera seller-profile.tsx
 *   - NÃO altera store-resolver.ts
 *   - localStorage permanece íntegro (não removido)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { generateSalt, hashPassword, verifyPassword, generateVerifyCode } from "./crypto";
import { IS_DEV_MODE, DEV_VERIFY_CODE } from "./devmode";

// ─── Email API (backend Hono) ─────────────────────────────────────────────────

async function apiSendVerifyEmail(email: string, name: string, code: string): Promise<void> {
  try {
    const res = await fetch("/api/auth/send-verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, code }),
    });
    const data = await res.json() as { success: boolean; simulated?: boolean; error?: string };
    if (data.simulated) {
      console.log(`[SANDBOX] E-mail de verificação simulado para ${email} — código: ${code}`);
    } else if (!data.success) {
      console.error("[EMAIL] Falha no envio de verificação:", data.error);
    }
  } catch (err) {
    console.error("[EMAIL] Erro de rede ao enviar verificação:", err);
  }
}

async function apiSendResetEmail(email: string, name: string, code: string): Promise<void> {
  try {
    const res = await fetch("/api/auth/send-reset-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, code }),
    });
    const data = await res.json() as { success: boolean; simulated?: boolean; error?: string };
    if (data.simulated) {
      console.log(`[SANDBOX] E-mail de recuperação simulado para ${email} — código: ${code}`);
    } else if (!data.success) {
      console.error("[EMAIL] Falha no envio de reset:", data.error);
    }
  } catch (err) {
    console.error("[EMAIL] Erro de rede ao enviar reset:", err);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserType = "client" | "seller";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type SubscriptionStatus = "trial" | "active" | "expired" | "suspended";

export interface SubscriptionInfo {
  registeredAt: string;
  trialEndsAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
}

export function subscriptionDaysRemaining(info: SubscriptionInfo): number {
  const now = new Date();
  const expires = new Date(info.expiresAt);
  return Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeSubscriptionStatus(info: SubscriptionInfo): SubscriptionStatus {
  if (info.status === "suspended") return "suspended";
  if (info.status === "active") {
    return subscriptionDaysRemaining(info) > 0 ? "active" : "expired";
  }
  return subscriptionDaysRemaining(info) > 0 ? "trial" : "expired";
}

export function createTrialSubscription(): SubscriptionInfo {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    registeredAt: now.toISOString(),
    trialEndsAt: trialEnd.toISOString(),
    expiresAt: trialEnd.toISOString(),
    status: "trial",
  };
}

export type Localidade =
  | "sede" | "cabucu" | "praia-do-sol" | "recreio"
  | "pedras-altas" | "araripe" | "porto" | "quiboa"
  | "itapema" | "acupe" | "condominio-praia-de-itapema"
  | "bom-jesus" | "outra";

export const LOCALIDADES: { value: Localidade; label: string }[] = [
  { value: "sede",                        label: "Sede de Saubara" },
  { value: "cabucu",                      label: "Cabuçu" },
  { value: "praia-do-sol",                label: "Praia do Sol" },
  { value: "recreio",                     label: "Recreio" },
  { value: "pedras-altas",                label: "Pedras Altas" },
  { value: "araripe",                     label: "Araripe" },
  { value: "porto",                       label: "Porto" },
  { value: "quiboa",                      label: "Quiboa" },
  { value: "itapema",                     label: "Itapema" },
  { value: "acupe",                       label: "Acupe" },
  { value: "condominio-praia-de-itapema", label: "Condomínio Praia de Itapema" },
  { value: "bom-jesus",                   label: "Bom Jesus dos Pobres" },
];

export interface UserAddress {
  localidade: Localidade;
  rua?: string;
  numero?: string;
  complemento?: string;
  referencia?: string;
}

export interface DeliveryConfig {
  ownDelivery: boolean;
  pickup: boolean;
  marketplaceDelivery: boolean;
  deliveryFee?: string;
  estimatedTime?: string;
  notes?: string;
  serviceArea?: Localidade[];
}

export interface AuthUser {
  id: string;
  type: UserType;
  canSell?: boolean;
  canBuy?: boolean;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  storeName?: string;
  storeCategory?: string;
  storeWhatsapp?: string;
  storeBio?: string;
  storeCover?: string;
  storeLogo?: string;
  storeHours?: string;
  storeLocalidade?: Localidade;
  storeAddress?: string;
  deliveryRates?: Partial<Record<Localidade, number>>;
  avatar?: string;
  address?: UserAddress;
  serviceArea?: Localidade[];
  deliveryConfig?: DeliveryConfig;
  subscription?: SubscriptionInfo;
  approvalStatus?: ApprovalStatus;
  approvalNote?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  verifyCode?: string;
  verifyCodeExpires?: string;
  verifyMethod?: "email" | "sms";
  photoResponsavel?: string;
  logoLoja?: string;
  fotoFachada?: string;
  registeredAt?: string;
  /** true quando a sessão corrente é gerida pelo backend (cookie HttpOnly) */
  _backendSession?: boolean;
}

export interface StoredUser extends AuthUser {
  passwordHash: string;
  passwordSalt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  verifyAccount: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerifyCode: () => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
  requestPasswordReset: (emailOrPhone: string) => Promise<{ success: boolean; error?: string }>;
  preValidateCode: (emailOrPhone: string, code: string) => Promise<{ valid: boolean; error?: string }>;
  resetPassword: (emailOrPhone: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export interface RegisterData {
  type: UserType;
  name: string;
  email: string;
  phone: string;
  password: string;
  cpf: string;
  storeName?: string;
  storeCategory?: string;
  storeWhatsapp?: string;
  storeBio?: string;
  storeHours?: string;
  storeAddress?: string;
  storeLocalidade?: Localidade;
  address?: UserAddress;
  serviceArea?: Localidade[];
  photoResponsavel?: string;
  logoLoja?: string;
  fotoFachada?: string;
  storeLogo?: string;
  storeCover?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "saubara_auth_user";
const USERS_KEY   = "saubara_registered_users";

// ─── Demo users ───────────────────────────────────────────────────────────────

const DEMO_USERS: StoredUser[] = [
  {
    id: "client-1",
    type: "client",
    name: "João Silva",
    email: "joao@exemplo.com",
    phone: "11999990001",
    cpf: "12345678901",
    passwordHash: "__DEMO__",
    passwordSalt: "__DEMO__",
    emailVerified: true,
    phoneVerified: false,
    registeredAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "seller-1",
    type: "seller",
    name: "Maria Santos",
    email: "maria@exemplo.com",
    phone: "11999990002",
    cpf: "98765432100",
    passwordHash: "__DEMO__",
    passwordSalt: "__DEMO__",
    emailVerified: true,
    phoneVerified: false,
    storeName: "Maria Cosméticos",
    storeCategory: "cosmeticos",
    approvalStatus: "approved",
    subscription: createTrialSubscription(),
    registeredAt: "2024-01-20T14:00:00.000Z",
  },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getStoredUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new Event("saubara:stores-updated"));
}

function toPublicUser(stored: StoredUser): AuthUser {
  const { passwordHash: _, passwordSalt: __, verifyCode: ___, verifyCodeExpires: ____, ...pub } = stored;
  return pub;
}

// ─── CPF validation (mod11) ───────────────────────────────────────────────────

function isValidCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(c[10])) return false;
  return true;
}

function newVerifyCode(): { code: string; expires: string } {
  const code = IS_DEV_MODE ? DEV_VERIFY_CODE : generateVerifyCode(6);
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return { code, expires };
}

// ─── S2.2: mapBackendUser ─────────────────────────────────────────────────────
//
// O backend (auth-routes.ts) retorna colunas diretamente do Drizzle/Turso,
// todas em snake_case. Campos de mapeamento conhecidos:
//
//   role                    → type  (backend usa "role", frontend usa "type")
//   can_sell                → canSell
//   can_buy                 → canBuy
//   email_verified          → emailVerified
//   phone_verified          → phoneVerified
//   approval_status         → approvalStatus
//   approval_note           → approvalNote
//   store_name              → storeName
//   store_category          → storeCategory
//   store_whatsapp          → storeWhatsapp
//   store_bio               → storeBio
//   store_logo              → storeLogo
//   store_cover             → storeCover
//   store_hours             → storeHours
//   store_localidade        → storeLocalidade
//   store_address           → storeAddress
//   address_json            → address   (JSON string ou objeto)
//   service_area_json       → serviceArea
//   delivery_config_json    → deliveryConfig
//   delivery_rates_json     → deliveryRates
//   subscription_status     → subscription.status
//   subscription_registered_at → subscription.registeredAt
//   subscription_trial_ends_at → subscription.trialEndsAt
//   subscription_expires_at → subscription.expiresAt
//   photo_responsavel       → photoResponsavel
//   logo_loja               → logoLoja
//   foto_fachada            → fotoFachada
//   created_at              → registeredAt
//
// O mapper também aceita camelCase para tolerância a mudanças futuras.

function safeParseJSON<T>(v: unknown): T | undefined {
  if (!v) return undefined;
  if (typeof v === "object") return v as T;
  try { return JSON.parse(v as string) as T; } catch { return undefined; }
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return s === "null" || s === "undefined" ? undefined : s || undefined;
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "true" || v === "1";
}

function buildSubscription(raw: Record<string, unknown>): SubscriptionInfo | undefined {
  const status = str(raw.subscription_status ?? raw.subscriptionStatus);
  const registeredAt = str(raw.subscription_registered_at ?? raw.subscriptionRegisteredAt ?? raw.created_at ?? raw.createdAt);
  const trialEndsAt  = str(raw.subscription_trial_ends_at ?? raw.subscriptionTrialEndsAt);
  const expiresAt    = str(raw.subscription_expires_at ?? raw.subscriptionExpiresAt);

  if (!status || !trialEndsAt || !expiresAt) return undefined;
  return {
    status: status as SubscriptionStatus,
    registeredAt: registeredAt ?? new Date().toISOString(),
    trialEndsAt,
    expiresAt,
  };
}

function mapBackendUser(raw: Record<string, unknown>): AuthUser {
  // "role" é o campo do DB; frontend usa "type"
  const role = str(raw.role) ?? str(raw.type) ?? "client";
  const type: UserType = (role === "seller" || role === "client") ? role as UserType : "client";

  return {
    id:              str(raw.id) ?? "",
    type,
    name:            str(raw.name) ?? "",
    email:           str(raw.email) ?? "",
    phone:           str(raw.phone) ?? "",
    cpf:             str(raw.cpf) ?? "",
    emailVerified:   bool(raw.email_verified ?? raw.emailVerified),
    phoneVerified:   bool(raw.phone_verified ?? raw.phoneVerified),
    canSell:         raw.can_sell != null ? bool(raw.can_sell) : (raw.canSell != null ? bool(raw.canSell) : undefined),
    canBuy:          raw.can_buy  != null ? bool(raw.can_buy)  : (raw.canBuy  != null ? bool(raw.canBuy)  : undefined),
    storeName:       str(raw.store_name      ?? raw.storeName),
    storeCategory:   str(raw.store_category  ?? raw.storeCategory),
    storeWhatsapp:   str(raw.store_whatsapp  ?? raw.storeWhatsapp),
    storeBio:        str(raw.store_bio       ?? raw.storeBio),
    storeLogo:       str(raw.store_logo      ?? raw.storeLogo),
    storeCover:      str(raw.store_cover     ?? raw.storeCover),
    storeHours:      str(raw.store_hours     ?? raw.storeHours),
    storeLocalidade: str(raw.store_localidade ?? raw.storeLocalidade) as Localidade | undefined,
    storeAddress:    str(raw.store_address   ?? raw.storeAddress),
    avatar:          str(raw.avatar),
    approvalStatus:  str(raw.approval_status  ?? raw.approvalStatus) as ApprovalStatus | undefined,
    approvalNote:    str(raw.approval_note    ?? raw.approvalNote),
    address:         safeParseJSON<UserAddress>(raw.address_json ?? raw.address),
    serviceArea:     safeParseJSON<Localidade[]>(raw.service_area_json ?? raw.serviceArea),
    deliveryConfig:  safeParseJSON<DeliveryConfig>(raw.delivery_config_json ?? raw.deliveryConfig),
    deliveryRates:   safeParseJSON<Partial<Record<Localidade, number>>>(raw.delivery_rates_json ?? raw.deliveryRates),
    subscription:    safeParseJSON<SubscriptionInfo>(raw.subscription) ?? buildSubscription(raw),
    photoResponsavel:str(raw.photo_responsavel ?? raw.photoResponsavel),
    logoLoja:        str(raw.logo_loja  ?? raw.logoLoja),
    fotoFachada:     str(raw.foto_fachada ?? raw.fotoFachada),
    registeredAt:    str(raw.created_at ?? raw.registeredAt),
    _backendSession: true,
  };
}

// ─── S2.2: Backend API wrappers ───────────────────────────────────────────────

/**
 * GET /api/auth/me — recupera sessão ativa via cookie HttpOnly.
 * Retorna null se não autenticado ou offline.
 */
async function backendGetMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    if (!data.success || !data.user) return null;
    return mapBackendUser(data.user as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/login
 * Retorna:
 *   { attempted: true, success: true, user }          → OK
 *   { attempted: true, success: false, needsVerify }  → email não verificado
 *   { attempted: true, success: false, error }        → credenciais/suspensão/etc
 *   { attempted: false }                              → rede offline, usar fallback
 */
async function backendLogin(
  emailOrPhone: string,
  password: string
): Promise<{ attempted: boolean; success?: boolean; user?: AuthUser; error?: string; needsVerify?: boolean }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrPhone, password }),
    });
    const data = await res.json() as Record<string, unknown>;
    const success = Boolean(data.success);

    // O backend sinaliza e-mail não verificado com error === "__NEEDS_VERIFY__"
    const needsVerify =
      !success && (data.error === "__NEEDS_VERIFY__" || data.code === "__NEEDS_VERIFY__");

    return {
      attempted:   true,
      success,
      user:        data.user ? mapBackendUser(data.user as Record<string, unknown>) : undefined,
      error:       data.error as string | undefined,
      needsVerify,
    };
  } catch {
    return { attempted: false };
  }
}

/**
 * POST /api/auth/register
 * Retorna null em falha de rede (usar fallback localStorage).
 */
async function backendRegister(data: RegisterData): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
} | null> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json() as Record<string, unknown>;
    return {
      success: Boolean(json.success),
      user:    json.user ? mapBackendUser(json.user as Record<string, unknown>) : undefined,
      error:   json.error as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/logout — revoga cookie HttpOnly.
 * Fire-and-forget.
 */
async function backendLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* silencia */ }
}

/**
 * POST /api/auth/verify-email
 */
async function backendVerifyEmail(code: string): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
} | null> {
  try {
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      success: Boolean(data.success),
      user:    data.user ? mapBackendUser(data.user as Record<string, unknown>) : undefined,
      error:   data.error as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/resend-verify
 */
async function backendResendVerify(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/resend-verify", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json() as { success: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Inicialização: backend-first, fallback localStorage.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Tenta sessão do backend (cookie HttpOnly)
      const backendUser = await backendGetMe();
      if (cancelled) return;

      if (backendUser) {
        setUser(backendUser);
        // Sincroniza localStorage para módulos legados
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backendUser));
        setLoading(false);
        return;
      }

      // 2. Fallback: localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch { /* */ }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveSession = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  // ─── Login ───────────────────────────────────────────────────────────────

  const login = async (
    emailOrPhone: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {

    // 1. Tenta backend
    const result = await backendLogin(emailOrPhone, password);

    if (result.attempted) {
      if (result.success && result.user) {
        saveSession(result.user);
        return { success: true };
      }
      if (result.needsVerify) {
        // Cria sessão parcial para o fluxo /verify-email
        // O cookie já foi setado pelo backend — basta recarregar /me para obter o user
        const partial = await backendGetMe();
        if (partial) saveSession(partial);
        return { success: false, error: "__NEEDS_VERIFY__" };
      }
      if (result.error && result.error !== "__NEEDS_VERIFY__") {
        // Erro de negócio (credenciais erradas, conta suspensa, etc.)
        // Não usa fallback — a conta existe no backend e a senha está errada
        return { success: false, error: result.error };
      }
      // attempted=true mas sem sucesso e sem erro claro → cai no fallback
    }

    // 2. Fallback localStorage (backend offline ou sem resposta)
    await new Promise((r) => setTimeout(r, 700));
    const allUsers: StoredUser[] = [...DEMO_USERS, ...getStoredUsers()];
    const found = allUsers.find((u) => u.email === emailOrPhone || u.phone === emailOrPhone);

    if (!found) {
      return { success: false, error: "Credenciais inválidas. Verifique e-mail/telefone e senha." };
    }

    let passwordOk = false;
    if (found.passwordSalt === "__DEMO__") {
      passwordOk = IS_DEV_MODE && password === "123456";
    } else if (found.passwordSalt === "__BACKEND__") {
      // Conta dual-write — a senha real está no Turso; não temos como verificar offline
      return { success: false, error: "Serviço temporariamente indisponível. Tente novamente." };
    } else {
      passwordOk = await verifyPassword(password, found.passwordSalt, found.passwordHash);
    }

    if (!passwordOk) return { success: false, error: "Senha incorreta. Tente novamente." };
    if (found.approvalStatus === "suspended") return { success: false, error: "Sua conta foi suspensa." };
    if (found.approvalStatus === "rejected") {
      return {
        success: false,
        error: found.approvalNote
          ? `Seu cadastro foi recusado: ${found.approvalNote}`
          : "Seu cadastro foi recusado. Entre em contato com o suporte.",
      };
    }
    if (!found.emailVerified) {
      const { code, expires } = newVerifyCode();
      const updated: StoredUser = { ...found, verifyCode: code, verifyCodeExpires: expires, verifyMethod: "email" };
      if (found.passwordSalt !== "__DEMO__") {
        saveStoredUsers(getStoredUsers().map((u) => u.id === found.id ? updated : u));
      }
      await apiSendVerifyEmail(found.email, found.name, code);
      saveSession({ ...toPublicUser(updated), emailVerified: false });
      return { success: false, error: "__NEEDS_VERIFY__" };
    }

    saveSession(toPublicUser(found));
    return { success: true };
  };

  // ─── Register ────────────────────────────────────────────────────────────

  const register = async (
    data: RegisterData
  ): Promise<{ success: boolean; error?: string }> => {

    // Validações locais rápidas
    if (!data.cpf) return { success: false, error: "CPF é obrigatório para cadastro." };
    const cpfClean = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cpfClean)) return { success: false, error: "CPF inválido. Verifique os dígitos e tente novamente." };
    if (data.password.length < 6) return { success: false, error: "A senha deve ter pelo menos 6 caracteres." };
    if (data.type === "seller") {
      if (!data.storeName) return { success: false, error: "Nome da loja é obrigatório." };
      if (!data.storeCategory) return { success: false, error: "Categoria da loja é obrigatória." };
    }

    // 1. Tenta backend
    const backendResult = await backendRegister(data);

    if (backendResult !== null) {
      if (!backendResult.success) {
        return { success: false, error: backendResult.error ?? "Erro ao cadastrar." };
      }
      // Sucesso no Turso → dual-write localStorage (módulos legados)
      if (backendResult.user) {
        _localDualWrite(data, cpfClean, backendResult.user);
        saveSession(backendResult.user);
      }
      return { success: true };
    }

    // 2. Fallback localStorage (backend offline)
    return _localRegisterFallback(data, cpfClean);
  };

  /**
   * Dual-write: grava versão sem senha no localStorage.
   * Sentinel "__BACKEND__" impede login local offline com esse usuário.
   */
  function _localDualWrite(data: RegisterData, cpfClean: string, backendUser: AuthUser): void {
    try {
      const localUser: StoredUser = {
        ...backendUser,
        cpf:          cpfClean,
        passwordHash: "__BACKEND__",
        passwordSalt: "__BACKEND__",
      };
      const existing = getStoredUsers().filter(
        (u) => u.cpf !== cpfClean && u.email !== data.email
      );
      saveStoredUsers([...existing, localUser]);
    } catch (e) {
      console.warn("[S2.2] dual-write localStorage falhou:", e);
    }
  }

  /**
   * Cadastro localStorage puro — fallback quando backend está offline.
   */
  async function _localRegisterFallback(
    data: RegisterData,
    cpfClean: string
  ): Promise<{ success: boolean; error?: string }> {
    await new Promise((r) => setTimeout(r, 700));

    const allUsers: StoredUser[] = [...DEMO_USERS, ...getStoredUsers()];
    if (allUsers.find((u) => u.cpf?.replace(/\D/g, "") === cpfClean)) {
      return { success: false, error: "Já existe uma conta cadastrada com este CPF." };
    }
    if (allUsers.find((u) => u.email === data.email)) {
      return { success: false, error: "Este e-mail já está cadastrado." };
    }
    if (allUsers.find((u) => u.phone === data.phone)) {
      return { success: false, error: "Este telefone já está cadastrado." };
    }

    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt);
    const { code, expires } = newVerifyCode();

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      type: data.type,
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: cpfClean,
      passwordHash: hash,
      passwordSalt: salt,
      storeName:       data.storeName,
      storeCategory:   data.storeCategory,
      storeWhatsapp:   data.storeWhatsapp,
      storeLogo:       data.storeLogo || data.logoLoja,
      storeCover:      data.storeCover || data.fotoFachada,
      storeBio:        data.storeBio,
      storeHours:      data.storeHours,
      storeAddress:    data.storeAddress,
      storeLocalidade: data.storeLocalidade || data.address?.localidade,
      address:         data.address,
      serviceArea:     data.serviceArea,
      subscription:    data.type === "seller" ? createTrialSubscription() : undefined,
      approvalStatus:  data.type === "seller" ? "approved" : undefined,
      canSell:         data.type === "seller" ? true : undefined,
      canBuy:          true,
      photoResponsavel:data.photoResponsavel,
      logoLoja:        data.logoLoja,
      fotoFachada:     data.fotoFachada,
      emailVerified:   false,
      phoneVerified:   false,
      verifyCode:      code,
      verifyCodeExpires: expires,
      verifyMethod:    "email",
      registeredAt:    new Date().toISOString(),
    };

    saveStoredUsers([...getStoredUsers(), newUser]);
    await apiSendVerifyEmail(data.email, data.name, code);
    saveSession(toPublicUser(newUser));
    return { success: true };
  }

  // ─── Verify account ───────────────────────────────────────────────────────

  const verifyAccount = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Sessão não encontrada. Faça login novamente." };
    await new Promise((r) => setTimeout(r, 500));

    // Sessão backend ativa
    if (user._backendSession) {
      const result = await backendVerifyEmail(code);
      if (result === null) {
        // Rede offline — tenta fallback abaixo
      } else {
        if (result.success) {
          const refreshed = result.user ?? await backendGetMe();
          if (refreshed) saveSession(refreshed);
          else saveSession({ ...user, emailVerified: true });
          return { success: true };
        }
        return { success: false, error: result.error ?? "Código inválido." };
      }
    }

    // Fallback localStorage
    const isDemoUser = DEMO_USERS.find((u) => u.id === user.id);
    if (isDemoUser) {
      if (IS_DEV_MODE && code.length === 6) {
        saveSession({ ...user, emailVerified: true });
        return { success: true };
      }
      return { success: false, error: "Código inválido." };
    }

    const users = getStoredUsers();
    const stored = users.find((u) => u.id === user.id);
    if (!stored) return { success: false, error: "Usuário não encontrado." };

    if (stored.verifyCodeExpires && new Date(stored.verifyCodeExpires) < new Date()) {
      return { success: false, error: "Código expirado. Solicite um novo código." };
    }
    const valid = IS_DEV_MODE
      ? (code.length === 6 && /^\d{6}$/.test(code))
      : code === stored.verifyCode;

    if (!valid) return { success: false, error: "Código incorreto. Verifique e tente novamente." };

    const updatedStored: StoredUser = { ...stored, emailVerified: true, verifyCode: undefined, verifyCodeExpires: undefined };
    saveStoredUsers(users.map((u) => u.id === stored.id ? updatedStored : u));
    saveSession(toPublicUser(updatedStored));
    return { success: true };
  };

  // ─── Resend verify code ───────────────────────────────────────────────────

  const resendVerifyCode = async (): Promise<void> => {
    if (!user) return;

    if (user._backendSession) {
      const ok = await backendResendVerify();
      if (ok) return;
      // Fallback: gera código local se backend falhou
    }

    const { code, expires } = newVerifyCode();
    const users = getStoredUsers();
    saveStoredUsers(users.map((u) =>
      u.id === user.id ? { ...u, verifyCode: code, verifyCodeExpires: expires } : u
    ));
    await apiSendVerifyEmail(user.email, user.name, code);
    await new Promise((r) => setTimeout(r, 500));
  };

  // ─── Request password reset ───────────────────────────────────────────────

  const requestPasswordReset = async (
    emailOrPhone: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      // Backend sempre retorna success:true (segurança)
      if (res.ok) return { success: true };
      if (data.error) return { success: false, error: data.error };
    } catch { /* fallback */ }

    // Fallback localStorage
    await new Promise((r) => setTimeout(r, 800));
    const users = getStoredUsers();
    const found = users.find((u) => u.email === emailOrPhone || u.phone === emailOrPhone);
    if (!found) return { success: true }; // segurança: não revela existência

    const { code, expires } = newVerifyCode();
    saveStoredUsers(users.map((u) =>
      u.id === found.id ? { ...u, verifyCode: code, verifyCodeExpires: expires, verifyMethod: "email" as const } : u
    ));
    await apiSendResetEmail(found.email, found.name, code);
    return { success: true };
  };

  // ─── Pre-validate reset code ──────────────────────────────────────────────

  const preValidateCode = async (
    emailOrPhone: string,
    code: string
  ): Promise<{ valid: boolean; error?: string }> => {
    if (code.length !== 6) return { valid: false, error: "Digite o código de 6 dígitos recebido." };

    try {
      const res = await fetch("/api/auth/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, code }),
      });
      const data = await res.json() as { valid?: boolean; error?: string };
      // Endpoint retorna { valid: true } ou { valid: false, error }
      return data.valid
        ? { valid: true }
        : { valid: false, error: data.error ?? "Código incorreto." };
    } catch { /* fallback */ }

    if (IS_DEV_MODE) return { valid: true };

    const users = getStoredUsers();
    const found = users.find((u) => u.email === emailOrPhone || u.phone === emailOrPhone);
    if (!found) return { valid: false, error: "Código incorreto. Verifique e tente novamente." };
    if (found.verifyCodeExpires && new Date(found.verifyCodeExpires) < new Date()) {
      return { valid: false, error: "Código expirado. Solicite um novo código." };
    }
    return code === found.verifyCode
      ? { valid: true }
      : { valid: false, error: "Código incorreto. Verifique e tente novamente." };
  };

  // ─── Reset password ────────────────────────────────────────────────────────

  const resetPassword = async (
    emailOrPhone: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 6) return { success: false, error: "A nova senha deve ter pelo menos 6 caracteres." };

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, code, newPassword }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) return { success: true };
      if (data.error) return { success: false, error: data.error };
    } catch { /* fallback */ }

    // Fallback localStorage
    await new Promise((r) => setTimeout(r, 700));
    const users = getStoredUsers();
    const found = users.find((u) => u.email === emailOrPhone || u.phone === emailOrPhone);
    if (!found) return { success: false, error: "Conta não encontrada." };
    if (found.verifyCodeExpires && new Date(found.verifyCodeExpires) < new Date()) {
      return { success: false, error: "Código expirado. Solicite um novo." };
    }
    const valid = IS_DEV_MODE ? (code.length === 6) : (code === found.verifyCode);
    if (!valid) return { success: false, error: "Código incorreto." };

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);
    saveStoredUsers(users.map((u) =>
      u.id === found.id
        ? { ...u, passwordHash: hash, passwordSalt: salt, verifyCode: undefined, verifyCodeExpires: undefined }
        : u
    ));
    return { success: true };
  };

  // ─── Logout ────────────────────────────────────────────────────────────────

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    backendLogout(); // fire-and-forget: revoga cookie HttpOnly
  };

  // ─── Update user ───────────────────────────────────────────────────────────

  const updateUser = (data: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    saveSession(updated);
    const users = getStoredUsers();
    saveStoredUsers(users.map((u) => u.id === user.id ? { ...u, ...data } : u));
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, verifyAccount, resendVerifyCode,
      logout, updateUser,
      requestPasswordReset, preValidateCode, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ─── Admin utilities — S2.3: migrado para API (Turso) ────────────────────────
//
// getAdminUserStats()  → GET /api/admin/stats    (async — use hook em admin.tsx)
// adminUpdateUser()    → PATCH /api/admin/users/:id
// getAllRegisteredUsers() → GET /api/admin/users  (retorna todos, sem paginação)
//
// Mantidas versões síncronas localStorage como FALLBACK OFFLINE.
// Quando backend disponível, admin.tsx usa as versões API diretamente.

export interface AdminUserStats {
  totalClients: number;
  totalSellers: number;
  totalVerified: number;
  totalPending: number;
  totalUnverified: number;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    type: UserType;
    emailVerified: boolean;
    registeredAt?: string;
    approvalStatus?: ApprovalStatus;
  }>;
}

/** @deprecated Use fetchAdminStats() (async, Turso) em admin.tsx */
export function getAdminUserStats(): AdminUserStats {
  const allUsers = [...DEMO_USERS, ...getStoredUsers()];
  const clients  = allUsers.filter((u) => u.type === "client");
  const sellers  = allUsers.filter((u) => u.type === "seller");
  const verified = allUsers.filter((u) => u.emailVerified);
  const unverified = allUsers.filter((u) => !u.emailVerified);
  const pendingApproval = sellers.filter((u) => u.approvalStatus === "pending");

  const recentUsers = [...allUsers]
    .sort((a, b) => {
      const da = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const db = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return db - da;
    })
    .slice(0, 10)
    .map((u) => ({
      id: u.id, name: u.name, email: u.email,
      type: u.type, emailVerified: u.emailVerified,
      registeredAt: u.registeredAt, approvalStatus: u.approvalStatus,
    }));

  return {
    totalClients:   clients.length,
    totalSellers:   sellers.length,
    totalVerified:  verified.length,
    totalPending:   pendingApproval.length,
    totalUnverified:unverified.length,
    recentUsers,
  };
}

/** @deprecated Use fetchAdminUsers() (async, Turso) em admin.tsx */
export function getAllRegisteredUsers(): StoredUser[] {
  return [...DEMO_USERS, ...getStoredUsers()];
}

/** @deprecated Use apiAdminUpdateUser() (async, Turso) em admin.tsx */
export function adminUpdateUser(id: string, patch: Partial<StoredUser>): void {
  const stored = getStoredUsers();
  const inStored = stored.find((u) => u.id === id);
  if (inStored) {
    saveStoredUsers(stored.map((u) => u.id === id ? { ...u, ...patch } : u));
  } else {
    const demo = DEMO_USERS.find((u) => u.id === id);
    if (demo) saveStoredUsers([...stored, { ...demo, ...patch }]);
  }
}

// ─── API admin helpers — S2.3 ─────────────────────────────────────────────────

/** Busca estatísticas do dashboard admin via Turso. */
export async function fetchAdminStats(): Promise<AdminUserStats | null> {
  try {
    const res = await fetch("/api/admin/stats", { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data?: AdminUserStats };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/** Lista usuários paginada via Turso. */
export async function fetchAdminUsers(opts?: {
  page?: number;
  limit?: number;
  role?: "client" | "seller";
  approval?: ApprovalStatus;
  search?: string;
}): Promise<{ users: StoredUser[]; sellers: StoredUser[]; clients: StoredUser[]; total: number; pages: number } | null> {
  try {
    const params = new URLSearchParams();
    if (opts?.page)     params.set("page",     String(opts.page));
    if (opts?.limit)    params.set("limit",    String(opts.limit));
    if (opts?.role)     params.set("role",     opts.role);
    if (opts?.approval) params.set("approval", opts.approval);
    if (opts?.search)   params.set("search",   opts.search);

    const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data?: any };
    if (!json.success || !json.data) return null;
    // Mapear campos snake_case backend → camelCase StoredUser frontend
    const mapUser = (u: any): StoredUser => ({
      id:              u.id,
      name:            u.name,
      email:           u.email,
      phone:           u.phone,
      cpf:             u.cpf,
      type:            (u.role === "seller" ? "seller" : "client") as UserType,
      emailVerified:   u.emailVerified ?? false,
      registeredAt:    u.registeredAt,
      approvalStatus:  u.approvalStatus as ApprovalStatus | undefined,
      approvalNote:    u.approvalNote,
      storeName:       u.storeName,
      storeCategory:   u.storeCategory,
      storeLocalidade: u.localidade,
      subscription:    u.subscriptionStatus ? {
        status:       u.subscriptionStatus,
        registeredAt: u.registeredAt,
        trialEndsAt:  u.trialEndsAt  ?? new Date().toISOString(),
        expiresAt:    u.expiresAt    ?? new Date().toISOString(),
      } : undefined,
    });
    return {
      users:   json.data.users?.map(mapUser)   ?? [],
      sellers: json.data.sellers?.map(mapUser) ?? [],
      clients: json.data.clients?.map(mapUser) ?? [],
      total:   json.data.total  ?? 0,
      pages:   json.data.pages  ?? 1,
    };
  } catch {
    return null;
  }
}

/** Atualiza usuário via API (Turso). Retorna true se sucesso. */
export async function apiAdminUpdateUser(
  id: string,
  patch: {
    approvalStatus?:      ApprovalStatus;
    approvalNote?:        string | null;
    subscriptionStatus?:  "trial" | "active" | "expired" | "suspended";
    subscriptionExpiresAt?: string;
    suspended?:           boolean;
  }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/users/${id}`, {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(patch),
    });
    const json = await res.json() as { success: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

/** Atualiza perfil do usuário logado via API (Turso). */
export async function updateUserProfile(patch: {
  name?:            string;
  phone?:           string;
  avatar?:          string;
  address?:         Record<string, unknown>;
  storeName?:       string;
  storeCategory?:   string;
  storeWhatsapp?:   string;
  storeBio?:        string;
  storeLogo?:       string;
  storeCover?:      string;
  storeHours?:      string;
  storeLocalidade?: string;
  storeAddress?:    string;
  deliveryConfig?:  Record<string, unknown>;
  deliveryRates?:   Record<string, unknown>;
  serviceArea?:     string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/me", {
      method:      "PATCH",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(patch),
    });
    const json = await res.json() as { success: boolean; error?: string };
    return json;
  } catch {
    return { success: false, error: "Erro de conexão." };
  }
}

// ─── Merchant profile lookup ──────────────────────────────────────────────────

export interface MerchantProfile {
  storeName?: string;
  storeLogo?: string;
  storeCover?: string;
  storeBio?: string;
  storeHours?: string;
  storeLocalidade?: Localidade;
  storeAddress?: string;
  storeWhatsapp?: string;
  storeCategory?: string;
  emailVerified?: boolean;
  verified?: boolean;
}

export function getMerchantByStoreName(storeName: string): MerchantProfile | null {
  if (!storeName) return null;
  const all = getAllRegisteredUsers();
  const merchant = all.find(
    (u) =>
      u.type === "seller" &&
      u.storeName &&
      u.storeName.trim().toLowerCase() === storeName.trim().toLowerCase()
  );
  if (!merchant) return null;
  return {
    storeName:       merchant.storeName,
    storeLogo:       merchant.storeLogo,
    storeCover:      merchant.storeCover,
    storeBio:        merchant.storeBio,
    storeHours:      merchant.storeHours,
    storeLocalidade: merchant.storeLocalidade,
    storeAddress:    merchant.storeAddress,
    storeWhatsapp:   merchant.storeWhatsapp,
    storeCategory:   merchant.storeCategory,
    emailVerified:   merchant.emailVerified,
    verified:        merchant.approvalStatus === "approved",
  };
}
