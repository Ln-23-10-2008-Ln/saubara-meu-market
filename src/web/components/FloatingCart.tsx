import { useLocation } from "wouter";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../lib/cart";

// Floating cart button — shown on all pages except /cart, /admin, /auth, /dashboard
export default function FloatingCart() {
  const { totalQty } = useCart();
  const [location, navigate] = useLocation();

  const hidden =
    location === "/cart" ||
    location.startsWith("/admin") ||
    location.startsWith("/auth") ||
    location.startsWith("/dashboard");

  // On mobile: only show if there are items in cart (bottom bar always shows the icon)
  // On desktop: same behavior
  if (hidden || totalQty === 0) return null;

  return (
    <>
      {/* Desktop: pill button bottom-right */}
      <button
        onClick={() => navigate("/cart")}
        className="hidden md:flex"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "20px",
          zIndex: 200,
          background: "linear-gradient(135deg, #0F9D8A, #0B7A6E)",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "12px 18px",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 6px 24px rgba(15,157,138,0.45)",
          cursor: "pointer",
          fontFamily: "'Poppins', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: "14px",
          transition: "transform 0.15s, box-shadow 0.15s",
          animation: "cartFloatIn 0.3s ease-out",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 30px rgba(15,157,138,0.55)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(15,157,138,0.45)";
        }}
      >
        <ShoppingCart style={{ width: "18px", height: "18px" }} />
        <span>Ver Carrinho</span>
        <span
          style={{
            background: "#FF8A50",
            color: "white",
            fontSize: "11px",
            fontWeight: 800,
            minWidth: "22px",
            height: "22px",
            borderRadius: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
          }}
        >
          {totalQty > 99 ? "99+" : totalQty}
        </span>
      </button>

      {/* Mobile: compact floating pill above the bottom bar — md:hidden controls visibility, no inline display */}
      <button
        onClick={() => navigate("/cart")}
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: "72px", // above MobileBottomBar (~56px) + 16px gap
          right: "16px",
          zIndex: 200,
          background: "linear-gradient(135deg, #0F9D8A, #0B7A6E)",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "10px 16px",
          alignItems: "center",
          gap: "7px",
          boxShadow: "0 4px 20px rgba(15,157,138,0.5)",
          cursor: "pointer",
          fontFamily: "'Poppins', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "13px",
          animation: "cartFloatIn 0.3s ease-out",
        }}
      >
        <ShoppingCart style={{ width: "17px", height: "17px" }} />
        <span>Carrinho</span>
        <span
          style={{
            background: "#FF8A50",
            color: "white",
            fontSize: "10px",
            fontWeight: 800,
            minWidth: "20px",
            height: "20px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
          }}
        >
          {totalQty > 99 ? "99+" : totalQty}
        </span>
      </button>

      <style>{`
        @keyframes cartFloatIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
