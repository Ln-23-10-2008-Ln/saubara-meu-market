/// <reference types="vite/client" />
/**
 * ─── Saubara Meu Market — Dev Mode / Sandbox ────────────────────────────────
 *
 * Controla o comportamento de autenticação e notificações durante desenvolvimento.
 *
 * Para ativar modo produção com envio real:
 *   1. Defina VITE_APP_ENV=production no arquivo .env da raiz do projeto
 *   2. Implemente os providers reais abaixo (sendSmsCode, sendEmailCode, sendWhatsAppCode)
 *   3. A UI de verificação se adapta automaticamente — sem alterações de componentes
 *
 * Providers disponíveis para integração futura:
 *   - SMS:      Twilio / Zenvia / TotalVoice
 *   - E-mail:   Resend / SendGrid / AWS SES
 *   - WhatsApp: Twilio WhatsApp API / Z-API / Evolution API
 * ────────────────────────────────────────────────────────────────────────────
 */

// ── Detecção de ambiente ────────────────────────────────────────────────────
export const IS_DEV_MODE =
  import.meta.env.MODE === "development" ||
  import.meta.env.VITE_APP_ENV !== "production";

/** Código fixo para testes em modo sandbox */
export const DEV_VERIFY_CODE = "123456";

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

/** Valida código — em dev aceita DEV_VERIFY_CODE ou qualquer 6 dígitos */
export function validateCode(input: string, _expected?: string): boolean {
  if (IS_DEV_MODE) return input.length === 6;
  return input === _expected;
}
