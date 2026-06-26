/// <reference types="vite/client" />
/**
 * ─── Saubara Meu Market — Dev Mode / Sandbox ────────────────────────────────
 *
 * IS_DEV_MODE é determinado exclusivamente por import.meta.env.MODE:
 *   - "development" → dev server local (vite)
 *   - "production"  → vite build (Railway, Dockerfile, CI)
 *
 * NÃO depende de VITE_APP_ENV — o Vite define MODE automaticamente.
 * Em produção, todo código dentro de `if (IS_DEV_MODE)` é eliminado
 * pelo tree-shaking do Rollup.
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── Detecção de ambiente ────────────────────────────────────────────────────
// import.meta.env.MODE é injetado pelo Vite:
//   vite dev   → "development"
//   vite build → "production"
export const IS_DEV_MODE = import.meta.env.MODE === "development";

/** Código fixo para testes em modo sandbox — nunca chega ao bundle de produção */
export const DEV_VERIFY_CODE = IS_DEV_MODE ? "123456" : "";

/** Retorna true quando qualquer código deve ser aceito sem validação real */
export const isDevMode = () => IS_DEV_MODE;

// ── Simulação de envio (substituir pelos providers reais) ───────────────────

/** Simula envio de SMS — trocar por Twilio/Zenvia em produção */
export async function sendSmsCode(phone: string, code: string): Promise<void> {
  if (IS_DEV_MODE) {
    console.log(`[DEV] SMS para ${phone}: código ${code}`);
    return;
  }
  // TODO: integração real
  // await twilioClient.messages.create({ to: phone, from: TWILIO_FROM, body: `Seu código Saubara: ${code}` });
  throw new Error("SMS provider não configurado.");
}

/** Simula envio de e-mail — trocar por Resend/SendGrid em produção */
export async function sendEmailCode(email: string, code: string): Promise<void> {
  if (IS_DEV_MODE) {
    console.log(`[DEV] E-mail para ${email}: código ${code}`);
    return;
  }
  // TODO: integração real
  // await resend.emails.send({ from: 'noreply@saubara.com.br', to: email, subject: 'Seu código de verificação', html: `<p>Código: <b>${code}</b></p>` });
  throw new Error("E-mail provider não configurado.");
}

/** Simula envio via WhatsApp — trocar por Z-API/Evolution em produção */
export async function sendWhatsAppCode(phone: string, code: string): Promise<void> {
  if (IS_DEV_MODE) {
    console.log(`[DEV] WhatsApp para ${phone}: código ${code}`);
    return;
  }
  // TODO: integração real
  // await evolutionApi.sendText({ number: phone, text: `Seu código Saubara Meu Market: *${code}*` });
  throw new Error("WhatsApp provider não configurado.");
}

/** Valida código — em dev aceita qualquer 6 dígitos; em prod exige correspondência exata */
export function validateCode(input: string, _expected?: string): boolean {
  if (IS_DEV_MODE) return input.length === 6;
  return input === _expected;
}
