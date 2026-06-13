import { useLocation, Link } from "wouter";
import { ShoppingCart, Home, HeadphonesIcon, User } from "lucide-react";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";

/**
 * Persistent bottom navigation bar for mobile.
 * Hidden on admin, auth, cart, and dashboard pages that have their own nav.
 */
export default function MobileBottomBar() {
  const { totalQty } = useCart();
  const { user } = useAuth();
  const [location] = useLocation();

  // Hide on pages that have their own full navigation
  const hidden =
    location.startsWith("/admin") ||
    location.startsWith("/auth") ||
    location.startsWith("/dashboard");

  if (hidden) return null;

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    padding: "8px 0",
    flex: 1,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: active ? "#0F9D8A" : "#9ca3af",
    fontFamily: "'Poppins', system-ui, sans-serif",
    transition: "color 0.15s",
    textDecoration: "none",
  });

  return (
    <nav
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 150,
        background: "white",
        borderTop: "1px solid #e5e7eb",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "stretch",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Home — Link renders as <a>, styled directly (no nested <button>) */}
      <Link to="/" style={itemStyle(isActive("/"))}>
        <Home style={{ width: "20px", height: "20px" }} />
        <span style={{ fontSize: "10px", fontWeight: isActive("/") ? 700 : 500 }}>Início</span>
      </Link>

      {/* Cart */}
      <Link to="/cart" style={{ ...itemStyle(isActive("/cart")), position: "relative" }}>
        <span style={{ position: "relative", display: "inline-flex" }}>
          <ShoppingCart style={{ width: "20px", height: "20px" }} />
          {totalQty > 0 && (
            <span style={{
              position: "absolute",
              top: "-6px",
              right: "-8px",
              background: "#FF8A50",
              color: "white",
              fontSize: "9px",
              fontWeight: 800,
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 1px 4px rgba(255,138,80,0.5)",
            }}>
              {totalQty > 99 ? "99+" : totalQty}
            </span>
          )}
        </span>
        <span style={{ fontSize: "10px", fontWeight: isActive("/cart") ? 700 : 500 }}>Carrinho</span>
      </Link>

      {/* Support */}
      <Link to="/suporte" style={itemStyle(isActive("/suporte"))}>
        <HeadphonesIcon style={{ width: "20px", height: "20px" }} />
        <span style={{ fontSize: "10px", fontWeight: isActive("/suporte") ? 700 : 500 }}>Suporte</span>
      </Link>

      {/* Account */}
      <Link to={user ? "/dashboard/client" : "/auth/login"} style={itemStyle(isActive("/dashboard"))}>
        <User style={{ width: "20px", height: "20px" }} />
        <span style={{ fontSize: "10px", fontWeight: isActive("/dashboard") ? 700 : 500 }}>
          {user ? "Minha Conta" : "Entrar"}
        </span>
      </Link>
    </nav>
  );
}
