import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../lib/auth";
import { IS_DEV_MODE, DEV_VERIFY_CODE } from "../../lib/devmode";

type Stage = "input" | "code" | "newpass" | "done";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { requestPasswordReset, resetPassword, preValidateCode } = useAuth();

  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0",
    borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s",
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!contact.trim()) {
      setError("Informe seu e-mail ou telefone.");
      return;
    }
    setLoading(true);
    await requestPasswordReset(contact.trim());
    setLoading(false);
    setStage("code");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length < 6) {
      setError("Digite o código de 6 dígitos recebido.");
      return;
    }
    // Valida o código antes de avançar — previne bypass para nova senha com código inválido
    setLoading(true);
    const res = await preValidateCode(contact.trim(), code);
    setLoading(false);
    if (!res.valid) {
      setError(res.error || "Código incorreto. Verifique e tente novamente.");
      return;
    }
    setStage("newpass");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const res = await resetPassword(contact.trim(), code, newPassword);
    setLoading(false);
    if (res.success) {
      setStage("done");
    } else {
      setError(res.error || "Erro ao redefinir senha.");
      if (res.error?.includes("Código")) setStage("code");
    }
  };

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F9D8A 0%, #0B7A6E 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "64px", height: "64px", background: "white", borderRadius: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}>
            <span style={{ fontSize: "32px" }}>
              {stage === "done" ? "✅" : stage === "newpass" ? "🔒" : stage === "code" ? "📬" : "🔑"}
            </span>
          </div>
          <h2 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>
            {stage === "done" ? "Senha redefinida!" :
             stage === "newpass" ? "Nova senha" :
             stage === "code" ? "Código enviado" : "Recuperar senha"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", margin: 0 }}>
            {stage === "done" ? "Sua senha foi alterada com sucesso" :
             stage === "newpass" ? "Crie uma nova senha segura" :
             stage === "code" ? "Verifique seu e-mail ou SMS" :
             "Informe o e-mail ou telefone da sua conta"}
          </p>
        </div>

        <div style={{
          background: "white", borderRadius: "20px", padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}>

          {/* ── Stage: input ─────────────────────────────────────── */}
          {stage === "input" && (
            <form onSubmit={handleRequestCode}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px" }}>
                Recuperar acesso
              </h3>
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 20px", lineHeight: 1.5 }}>
                Informe o e-mail ou telefone da conta. Enviaremos um código de verificação.
              </p>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>
                  E-mail ou telefone
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="seu@email.com ou 11999990001"
                  style={inp}
                  onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                />
              </div>

              {error && (
                <div style={{ background: "#FFF3F3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#c62828", fontSize: "13px" }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "14px",
                  background: loading ? "#ccc" : "#0F9D8A",
                  color: "white", border: "none", borderRadius: "10px",
                  fontSize: "15px", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer", marginBottom: "16px",
                }}
              >
                {loading ? "Enviando..." : "Enviar código de recuperação"}
              </button>

              <p style={{ textAlign: "center", fontSize: "13px", color: "#666", margin: 0 }}>
                Lembrou a senha?{" "}
                <button
                  onClick={() => navigate("/auth/login")}
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#0F9D8A", fontWeight: 700, fontSize: "13px" }}
                >
                  Entrar
                </button>
              </p>
            </form>
          )}

          {/* ── Stage: code ──────────────────────────────────────── */}
          {stage === "code" && (
            <form onSubmit={handleVerifyCode}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>
                Digite o código
              </h3>
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 16px", lineHeight: 1.5 }}>
                Enviamos um código de 6 dígitos para <strong>{contact}</strong>.
              </p>

              {IS_DEV_MODE && (
                <div style={{
                  background: "#FFF3CD", border: "1.5px solid #FFC107", borderRadius: "10px",
                  padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#7A4F00",
                }}>
                  🧪 Modo sandbox: use o código <strong>{DEV_VERIFY_CODE}</strong>
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>
                  Código de verificação
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  style={{ ...inp, textAlign: "center", fontSize: "22px", fontWeight: 700, letterSpacing: "8px", fontFamily: "monospace" }}
                  onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                />
              </div>

              {error && (
                <div style={{ background: "#FFF3F3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#c62828", fontSize: "13px" }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%", padding: "14px", background: "#0F9D8A",
                  color: "white", border: "none", borderRadius: "10px",
                  fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "12px",
                }}
              >
                Verificar código
              </button>

              <button
                type="button"
                onClick={() => setStage("input")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#999", fontSize: "12px", width: "100%",
                }}
              >
                ← Tentar outro e-mail/telefone
              </button>
            </form>
          )}

          {/* ── Stage: newpass ───────────────────────────────────── */}
          {stage === "newpass" && (
            <form onSubmit={handleResetPassword}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>
                Criar nova senha
              </h3>
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 20px" }}>
                Escolha uma senha com pelo menos 6 caracteres.
              </p>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>
                  Nova senha
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ ...inp, paddingRight: "44px" }}
                    onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                    onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "18px", color: "#999",
                    }}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  style={inp}
                  onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
                />
              </div>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Força da senha:</div>
                  <div style={{ height: "4px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: newPassword.length < 6 ? "25%" : newPassword.length < 8 ? "50%" : newPassword.length < 12 ? "75%" : "100%",
                      background: newPassword.length < 6 ? "#e53935" : newPassword.length < 8 ? "#FF8A50" : newPassword.length < 12 ? "#eab308" : "#22c55e",
                      transition: "all 0.3s",
                      borderRadius: "4px",
                    }} />
                  </div>
                </div>
              )}

              {error && (
                <div style={{ background: "#FFF3F3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#c62828", fontSize: "13px" }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "14px",
                  background: loading ? "#ccc" : "#0F9D8A",
                  color: "white", border: "none", borderRadius: "10px",
                  fontSize: "15px", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Salvando..." : "✓ Salvar nova senha"}
              </button>
            </form>
          )}

          {/* ── Stage: done ──────────────────────────────────────── */}
          {stage === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "72px", height: "72px", background: "#f0faf9", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: "36px",
              }}>
                🔓
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 10px" }}>
                Senha alterada com sucesso!
              </h3>
              <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.6, margin: "0 0 24px" }}>
                Sua senha foi redefinida. Acesse sua conta com a nova senha.
              </p>
              <button
                onClick={() => navigate("/auth/login")}
                style={{
                  width: "100%", padding: "14px", background: "#0F9D8A",
                  color: "white", border: "none", borderRadius: "10px",
                  fontSize: "15px", fontWeight: 700, cursor: "pointer",
                }}
              >
                Entrar com nova senha
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.8)", fontSize: "13px",
            }}
          >
            ← Voltar ao início
          </button>
        </p>
      </div>
    </div>
  );
}
