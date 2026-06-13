/**
 * RequireAuth — Route guard component
 *
 * Wraps protected routes. Behavior:
 * - If loading: show spinner
 * - If not logged in: redirect to /auth/login
 * - If logged in but email not verified: redirect to /auth/verify
 * - If seller with approvalStatus "suspended": show block screen
 * - Otherwise: render children
 */
import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "../lib/auth";

interface RequireAuthProps {
  children: ReactNode;
  /** If set, only allow this user type */
  type?: "client" | "seller";
  /** If true, allow unverified users (only for /auth/verify page itself) */
  allowUnverified?: boolean;
}

export default function RequireAuth({ children, type, allowUnverified = false }: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fffe",
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px", height: "48px",
            border: "4px solid #e0e0e0",
            borderTop: "4px solid #0F9D8A",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: "#888", fontSize: "14px" }}>Carregando...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth/login" />;
  }

  // Must verify email before accessing dashboard
  if (!allowUnverified && !user.emailVerified) {
    return <Redirect to="/auth/verify" />;
  }

  // Type guard
  if (type && user.type !== type) {
    return <Redirect to="/" />;
  }

  // Suspended seller — hard block
  if (user.type === "seller" && user.approvalStatus === "suspended") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f5f5 0%, #ececec 100%)",
        fontFamily: "'Poppins', system-ui, sans-serif",
        padding: "24px",
      }}>
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px 36px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          border: "1.5px solid #ffcdd2",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#c62828", margin: "0 0 10px" }}>
            Conta suspensa
          </h2>
          <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.6, margin: "0 0 24px" }}>
            Sua conta foi suspensa pelo administrador da plataforma.
            {user.approvalNote && (
              <><br /><br /><strong>Motivo:</strong> {user.approvalNote}</>
            )}
          </p>
          <a
            href="/suporte"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#0F9D8A",
              color: "white",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Entrar em contato com o suporte
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
