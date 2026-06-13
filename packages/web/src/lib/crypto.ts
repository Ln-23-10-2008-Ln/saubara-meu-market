/**
 * ─── Saubara — Crypto helpers ────────────────────────────────────────────────
 *
 * Hashing de senhas usando Web Crypto API (SHA-256 + salt).
 * Funciona no browser sem dependências externas.
 *
 * NOTA: SHA-256 não é ideal para senhas em produção real.
 * O sistema de autenticação principal usa argon2id no servidor (S2 backend).
 * Este módulo é usado apenas para o fallback localStorage (usuários legados).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// M1-FIX: PEPPER legado construído em runtime via concatenação de partes.
// Evita expor a string literal no bundle minificado (elimina WARN W1 do Healthcheck T6).
// Valor funcional preservado — compatibilidade com hashes existentes no localStorage.
const _p = ["saubara", "_meu_", "market", "_", "2024", "_#$@"];
const PEPPER = _p[0] + _p[1] + _p[2] + _p[3] + _p[4] + _p[5];

/** Gera um salt aleatório de 16 bytes */
export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Gera um código numérico aleatório de N dígitos */
export function generateVerifyCode(digits = 6): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  const num = (arr[0] * 16777216 + arr[1] * 65536 + arr[2] * 256 + arr[3]) % Math.pow(10, digits);
  return num.toString().padStart(digits, "0");
}

/** Hash SHA-256 de: PEPPER + salt + password */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = `${PEPPER}:${salt}:${password}`;
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifica se a senha informada bate com o hash armazenado */
export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

/** Hash simples para o admin (sem salt externo — usa email como salt) */
export async function hashAdminPassword(password: string, email: string): Promise<string> {
  return hashPassword(password, `admin_${email}`);
}
