/// <reference types="vite/client" />
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../lib/auth";
import { IS_DEV_MODE, DEV_VERIFY_CODE } from "../../lib/devmode";

// Detect if backend has real email configured (checked via env at build time)
// In sandbox/dev, emails are simulated; code is shown in UI for convenience.
const IS_EMAIL_REAL = import.meta.env.VITE_EMAIL_CONFIGURED === "true";

export default function VerifyPage() {
  const [, navigate] = useLocation();
  const { user, verifyAccount, resendVerifyCode, logout } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [method, setMethod] = useState<"sms" | "email">("email");
  const [resent, setResent] = useState(false);
  const [resentCountdown, setResentCountdown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if user is not pending verification
  useEffect(() => {
    if (!user) {
      navigate("/auth/login");
      return;
    }
    if (user.emailVerified) {
      // Already verified — go to dashboard
      navigate(user.type === "seller" ? "/dashboard/seller" : "/dashboard/client");
    }
  }, [user]);

  // Resend countdown
  useEffect(() => {
    if (resentCountdown <= 0) return;
    const t = setTimeout(() => setResentCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resentCountdown]);

  const destination = user?.type === "seller" ? "/dashboard/seller" : "/dashboard/client";

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    setError("");
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const fillDevCode = () => {
    setCode(DEV_VERIFY_CODE.split(""));
    setError("");
    inputRefs.current[5]?.focus();
  };

  const handleResend = async () => {
    if (resentCountdown > 0) return;
    await resendVerifyCode();
    setResent(true);
    setResentCountdown(60);
    setTimeout(() => setResent(false), 4000);
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("Digite o código completo de 6 dígitos.");
      return;
    }
    setLoading(true);
    const res = await verifyAccount(fullCode);
    setLoading(false);
    if (res.success) {
      navigate(destination);
    } else {
      setError(res.error || "Código inválido. Tente novamente.");
    }
  };

  const skipVerify = async () => {
    if (!IS_DEV_MODE) return;
    // In dev mode: auto-verify with the dev code
    setLoading(true);
    const res = await verifyAccount(DEV_VERIFY_CODE);
    setLoading(false);
    if (res.success) navigate(destination);
    else setError(res.error || "Erro.");
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const maskedPhone = user?.phone
    ? `(${user.phone.slice(0, 2)}) ****-${user.phone.slice(-4)}`
    : "seu telefone";
  const maskedEmail = user?.email
    ? user.email.replace(/(.{2}).+(@.+)/, "$1***$2")
    : "seu e-mail";

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F9D8A 0%, #0B7A6E 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* ── Dev Mode Banner — only shown in sandbox/dev mode ─────── */}
        {IS_DEV_MODE && !IS_EMAIL_REAL && (
          <div style={{
            background: "#FFF3CD",
            border: "1.5px solid #FFC107",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>🧪</span>
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#7A4F00" }}>
                Sistema em modo de testes
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#7A4F00", margin: 0, lineHeight: 1.5 }}>
              Nenhum e-mail real está sendo enviado neste ambiente. Use o código de teste abaixo ou clique em <strong>"Entrar sem verificar"</strong>.
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "white", border: "1.5px dashed #FFC107",
              borderRadius: "10px", padding: "10px 14px", marginTop: "4px",
            }}>
              <div>
                <div style={{ fontSize: "11px", color: "#999", fontWeight: 600, marginBottom: "2px" }}>
                  CÓDIGO DE TESTE (visível apenas em sandbox)
                </div>
                <div style={{
                  fontSize: "26px", fontWeight: 800, letterSpacing: "8px",
                  color: "#0F9D8A", fontFamily: "monospace",
                }}>
                  {DEV_VERIFY_CODE}
                </div>
              </div>
              <button
                onClick={fillDevCode}
                style={{
                  background: "#0F9D8A", color: "white", border: "none",
                  borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
                  fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap",
                }}
              >
                Usar código
              </button>
            </div>
          </div>
        )}

        {/* ── Production mode: e-mail real enviado ─────────────────── */}
        {IS_EMAIL_REAL && (
          <div style={{
            background: "#E8F5E9",
            border: "1.5px solid #66BB6A",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}>
            <span style={{ fontSize: "20px", flexShrink: 0 }}>📧</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "#2E7D32" }}>E-mail enviado com sucesso</div>
              <p style={{ fontSize: "12px", color: "#388E3C", margin: "3px 0 0", lineHeight: 1.5 }}>
                Verifique sua caixa de entrada e a pasta de spam. O código expira em 10 minutos.
              </p>
            </div>
          </div>
        )}

        {/* ── Logo ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "56px", height: "56px", background: "white", borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}>
            <span style={{ fontSize: "28px" }}>✉️</span>
          </div>
          <h2 style={{ color: "white", fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>
            Verificar conta
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", margin: 0 }}>
            {method === "sms"
              ? `Código enviado para ${maskedPhone}`
              : `Código enviado para ${maskedEmail}`}
          </p>
        </div>

        {/* ── Card ───────────────────────────────────────────────── */}
        <div style={{
          background: "white", borderRadius: "20px", padding: "28px 28px 24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}>

          {/* Method toggle */}
          <div style={{
            display: "flex", background: "#f5f5f5", borderRadius: "10px",
            padding: "4px", marginBottom: "20px",
          }}>
            {(["email", "sms"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} style={{
                flex: 1, padding: "8px", border: "none", borderRadius: "8px",
                cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.2s",
                background: method === m ? "white" : "transparent",
                color: method === m ? "#0F9D8A" : "#999",
                boxShadow: method === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              }}>
                {m === "sms" ? "📱 SMS" : "📧 E-mail"}
              </button>
            ))}
          </div>

          {/* Info message */}
          <div style={{
            background: "#f0faf9", borderRadius: "10px", padding: "12px 14px",
            marginBottom: "20px", fontSize: "13px", color: "#0B7A6E", lineHeight: 1.5,
          }}>
            {method === "email"
              ? `📧 Enviamos um código de 6 dígitos para ${maskedEmail}. Verifique também a pasta de spam.`
              : `📱 Enviamos um código de 6 dígitos via SMS para ${maskedPhone}.`}
          </div>

          {/* Code inputs */}
          <div style={{
            display: "flex", gap: "8px", justifyContent: "center", marginBottom: "22px",
          }}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                style={{
                  width: "44px", height: "52px", textAlign: "center",
                  fontSize: "22px", fontWeight: 700,
                  border: `2px solid ${digit ? "#0F9D8A" : "#e0e0e0"}`,
                  borderRadius: "10px", outline: "none",
                  color: "#1a1a1a", background: digit ? "#f0faf9" : "white",
                  transition: "all 0.15s", fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                onBlur={(e) => (e.target.style.borderColor = digit ? "#0F9D8A" : "#e0e0e0")}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#FFF3F3", border: "1px solid #ffcdd2",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "14px",
              color: "#c62828", fontSize: "13px",
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={loading || code.join("").length < 6}
            style={{
              width: "100%", padding: "14px",
              background: (loading || code.join("").length < 6) ? "#ccc" : "#0F9D8A",
              color: "white", border: "none", borderRadius: "10px",
              fontSize: "15px", fontWeight: 700,
              cursor: (loading || code.join("").length < 6) ? "not-allowed" : "pointer",
              marginBottom: "12px",
            }}
          >
            {loading ? "Verificando..." : "✓ Confirmar código"}
          </button>

          {/* Dev: skip button — only in sandbox/dev mode without real email */}
          {IS_DEV_MODE && !IS_EMAIL_REAL && (
            <button
              onClick={skipVerify}
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: "#fff8ec", color: "#b87000",
                border: "1.5px solid #FFC107", borderRadius: "10px",
                fontSize: "13px", fontWeight: 700, cursor: "pointer",
                marginBottom: "16px", display: "flex",
                alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              🧪 Entrar sem verificar (modo sandbox)
            </button>
          )}

          {/* Resend */}
          <div style={{ textAlign: "center" }}>
            {resent ? (
              <p style={{ color: "#0F9D8A", fontSize: "13px", fontWeight: 600, margin: 0 }}>
                {IS_DEV_MODE ? "🧪 Simulação de reenvio (modo dev)" : "✓ Código reenviado!"}
              </p>
            ) : (
              <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>
                Não recebeu?{" "}
                {resentCountdown > 0 ? (
                  <span style={{ color: "#aaa" }}>Aguarde {resentCountdown}s para reenviar</span>
                ) : (
                  <button onClick={handleResend} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#0F9D8A", fontWeight: 700, fontSize: "13px",
                  }}>
                    Reenviar código
                  </button>
                )}
              </p>
            )}
          </div>

          {/* Footer note */}
          <div style={{
            marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f0f0f0",
            textAlign: "center",
          }}>
            {IS_DEV_MODE && !IS_EMAIL_REAL ? (
              <p style={{ fontSize: "11px", color: "#bbb", margin: 0, lineHeight: 1.5 }}>
                🔧 Ambiente de testes — configure <code style={{ fontSize: "10px", background: "#f5f5f5", padding: "1px 5px", borderRadius: "4px" }}>RESEND_API_KEY</code> para ativar envio real
              </p>
            ) : (
              <p style={{ fontSize: "11px", color: "#bbb", margin: 0 }}>
                O código expira em 10 minutos.
              </p>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div style={{ textAlign: "center", marginTop: "16px", display: "flex", justifyContent: "center", gap: "20px" }}>
          <button onClick={handleLogout} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.7)", fontSize: "13px",
          }}>
            ← Cancelar e sair
          </button>
        </div>
      </div>
    </div>
  );
}
