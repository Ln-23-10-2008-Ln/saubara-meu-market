import { useState } from "react";
import { useLocation } from "wouter";
import { smartBack } from "../../lib/navigation";
import { useAuth } from "../../lib/auth";
import { IS_DEV_MODE } from "../../lib/devmode";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login, user } = useAuth();
  const [form, setForm] = useState({ emailOrPhone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.emailOrPhone || !form.password) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    const res = await login(form.emailOrPhone, form.password);
    setLoading(false);

    if (res.success) {
      // Auth context updated — determine destination from stored user
      const stored = localStorage.getItem("saubara_auth_user");
      if (stored) {
        const u = JSON.parse(stored);
        navigate(u.type === "seller" ? "/dashboard/seller" : "/dashboard/client");
      } else {
        navigate("/");
      }
    } else if (res.error === "__NEEDS_VERIFY__") {
      // User exists but needs email verification
      navigate("/auth/verify");
    } else {
      setError(res.error || "Erro ao fazer login.");
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0",
    borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s", fontFamily: "inherit",
  };

  return (
    <div style={{
      fontFamily: "'Poppins', system-ui, sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F9D8A 0%, #0B7A6E 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <div style={{ width: "44px", height: "44px", background: "white", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "22px" }}>🛍️</span>
              </div>
              <span style={{ color: "white", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.5px" }}>Saubara</span>
            </div>
          </button>
          <p style={{ color: "rgba(255,255,255,0.8)", marginTop: "8px", fontSize: "14px" }}>Bem-vindo de volta!</p>
        </div>

        {/* Dev Mode Banner */}
        {IS_DEV_MODE && (
          <div style={{
            background: "#FFF3CD", border: "1.5px solid #FFC107", borderRadius: "12px",
            padding: "10px 14px", marginBottom: "14px",
            display: "flex", alignItems: "flex-start", gap: "8px",
          }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>🧪</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "12px", color: "#7A4F00" }}>Modo Sandbox — Desenvolvimento</div>
              <div style={{ fontSize: "11px", color: "#7A4F00", marginTop: "2px", lineHeight: 1.5 }}>
                Login demo: <strong>joao@exemplo.com</strong> / <strong>123456</strong> (cliente)
                &nbsp;|&nbsp;
                <strong>maria@exemplo.com</strong> / <strong>123456</strong> (comerciante)
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{
          background: "white", borderRadius: "20px", padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 24px" }}>
            Entrar na sua conta
          </h1>

          <form onSubmit={handleSubmit}>
            {/* Email / Phone */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>
                E-mail ou telefone
              </label>
              <input
                type="text"
                value={form.emailOrPhone}
                onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                placeholder="seu@email.com ou 11999990001"
                style={inp}
                onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "8px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#555", marginBottom: "6px" }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Sua senha"
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

            {/* Forgot */}
            <div style={{ textAlign: "right", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => navigate("/auth/forgot-password")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#0F9D8A", fontSize: "13px", fontWeight: 600,
                }}
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#FFF3F3", border: "1px solid #ffcdd2",
                borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
                color: "#c62828", fontSize: "13px",
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px",
                background: loading ? "#ccc" : "#0F9D8A",
                color: "white", border: "none", borderRadius: "10px",
                fontSize: "15px", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", margin: "20px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#e0e0e0" }} />
            <span style={{ padding: "0 12px", color: "#aaa", fontSize: "12px" }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: "#e0e0e0" }} />
          </div>

          {/* Register CTA */}
          <p style={{ textAlign: "center", fontSize: "14px", color: "#666", margin: 0 }}>
            Não tem conta?{" "}
            <button
              onClick={() => navigate("/auth/register")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#0F9D8A", fontWeight: 700, fontSize: "14px",
              }}
            >
              Cadastre-se grátis
            </button>
          </p>
        </div>

        {/* Back */}
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => smartBack(navigate)}
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
