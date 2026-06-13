/**
 * auth-service.ts — Saubara Meu Market
 * Argon2id hashing + SHA-256 legacy re-hash
 * Export: hashPasswordArgon2, verifyPasswordArgon2, hashSHA256
 */

const PEPPER = process.env.PEPPER ?? "saubara_pepper_default_dev_only";

// ─── SHA-256 (legacy) ─────────────────────────────────────────────────────────
export async function hashSHA256(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(password + salt + PEPPER);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Argon2id (via Bun.password) ─────────────────────────────────────────────
export async function hashPasswordArgon2(password: string): Promise<string> {
  return Bun.password.hash(password + PEPPER, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });
}

export async function verifyPasswordArgon2(password: string, hash: string): Promise<boolean> {
  // Detect legacy SHA-256 hash (64 hex chars, no $argon2)
  if (!hash.startsWith("$argon2")) {
    // Legacy: hash is stored as sha256Hex — extract salt from stored data
    // Legacy format: sha256(password + salt + PEPPER)
    // We cannot verify without salt — rehash path handled in auth-routes
    return false;
  }
  return Bun.password.verify(password + PEPPER, hash);
}

// ─── HMAC-SHA256 (admin token) ────────────────────────────────────────────────
export async function signHMAC(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyHMAC(data: string, signature: string, secret: string): Promise<boolean> {
  const expected = await signHMAC(data, secret);
  if (expected.length !== signature.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// ─── ID generator ─────────────────────────────────────────────────────────────
export function generateId(len = 21): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

// ─── Random code ──────────────────────────────────────────────────────────────
export function generateCode(len = 6): string {
  const digits = "0123456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) code += digits[b % 10];
  return code;
}
