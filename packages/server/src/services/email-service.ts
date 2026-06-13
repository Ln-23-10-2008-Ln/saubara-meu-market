/**
 * email-service.ts — Resend integration
 * Sends verification and reset emails
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL     = "Saubara Meu Market <noreply@saubarameumarket.com.br>";
const IS_DEV         = process.env.NODE_ENV !== "production";

interface SendResult {
  success: boolean;
  simulated?: boolean;
  error?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SIM] Para: ${to} | ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    const data = await res.json() as { id?: string; error?: { message: string } };
    if (!res.ok) {
      const errMsg = data.error?.message ?? "Resend error";
      if (IS_DEV) {
        console.warn(`[EMAIL SIM] Resend falhou (${errMsg}) → modo simulado`);
        return { success: true, simulated: true };
      }
      return { success: false, error: errMsg };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (IS_DEV) return { success: true, simulated: true };
    return { success: false, error: msg };
  }
}

export async function sendVerifyEmail(email: string, name: string, code: string): Promise<SendResult> {
  const subject = "Verifique seu e-mail — Saubara Meu Market";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0F9D8A">Olá, ${name}!</h2>
      <p>Use o código abaixo para verificar seu e-mail:</p>
      <div style="background:#f0fdf4;border:2px solid #0F9D8A;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:32px;font-weight:bold;color:#0F9D8A;letter-spacing:8px">${code}</span>
      </div>
      <p style="color:#666;font-size:14px">Este código expira em 30 minutos.</p>
      <p style="color:#999;font-size:12px">Se você não criou uma conta no Saubara Meu Market, ignore este e-mail.</p>
    </div>
  `;
  return sendEmail(email, subject, html);
}

export async function sendResetEmail(email: string, name: string, code: string): Promise<SendResult> {
  const subject = "Recuperação de senha — Saubara Meu Market";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#0F9D8A">Olá, ${name}!</h2>
      <p>Use o código abaixo para redefinir sua senha:</p>
      <div style="background:#fff7ed;border:2px solid #f97316;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:32px;font-weight:bold;color:#f97316;letter-spacing:8px">${code}</span>
      </div>
      <p style="color:#666;font-size:14px">Este código expira em 30 minutos.</p>
      <p style="color:#999;font-size:12px">Se você não solicitou recuperação de senha, ignore este e-mail.</p>
    </div>
  `;
  return sendEmail(email, subject, html);
}
