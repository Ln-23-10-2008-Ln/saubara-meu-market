import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useBack } from "../lib/navigation";
import {
  ArrowLeft, MessageCircle, ShoppingCart, Heart, Star,
  Check, Plus, Minus, Store as StoreIcon, MapPin,
} from "lucide-react";
import { categories } from "../lib/data";
import { resolveStores } from "../lib/store-resolver";
import { formatPrice, buildWhatsAppLink } from "../lib/utils";
import { useCart } from "../lib/cart";
import { useFavorites } from "../lib/favorites";
import OrderModal from "../components/OrderModal";
import { LOCALIDADES } from "../lib/auth";


export default function ProductPage() {
  const { storeId, productId } = useParams<{ storeId: string; productId: string }>();
  const [, navigate] = useLocation();
  const { back: goBack } = useBack(`/store/${storeId}`);
  const { addItem, updateQty, removeItem, items, isInCart } = useCart();
  const { isProductFav, toggleProduct } = useFavorites();
  const [orderOpen, setOrderOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const storeFound = resolveStores().find((s) => s.id === storeId);
  const productFound = storeFound?.products.find((p) => p.id === productId);

  if (!storeFound || !productFound) {
    return (
      <div style={{ minHeight: "100vh", background: "#F7FAF9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center" }}>
        <span style={{ fontSize: "56px" }}>📦</span>
        <h2 style={{ fontWeight: 700, fontSize: "18px", color: "#333" }}>Produto não encontrado</h2>
        <p style={{ color: "#888", fontSize: "13px" }}>Este produto pode ter sido removido ou não existe.</p>
        <button
          onClick={() => navigate("/")}
          style={{ background: "#0F9D8A", color: "white", border: "none", borderRadius: "12px", padding: "12px 28px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
        >
          Ir para o início
        </button>
      </div>
    );
  }

  const store = storeFound;
  const product = productFound;

  const catData = categories.find((c) => c.id === store.category);
  const locLabel = LOCALIDADES.find((l) => l.value === store.localidade)?.label ?? store.neighborhood ?? "";
  const cartItem = items.find((i) => i.id === product.id);
  const inCart = isInCart(product.id);
  const fav = isProductFav(product.id);

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      imageUrl: product.imageUrl,
      storeId: store.id,
      storeName: store.name,
      storeWhatsapp: store.whatsapp,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleFav() {
    toggleProduct({
      id: product.id,
      storeId: store.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      storeName: store.name,
    });
  }

  const orderProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    unit: product.unit,
    imageUrl: product.imageUrl,
    storeName: store.name,
    storeWhatsapp: store.whatsapp,
  };

  // Related products (same store, exclude current)
  const related = store.products.filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#F7FAF9", fontFamily: "'Inter', sans-serif", paddingBottom: "100px" }}>

        {/* ── Product image hero ── */}
        <div style={{ position: "relative", width: "100%", background: "#f0f0f0" }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: "100%", maxHeight: "340px", objectFit: "cover", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=70";
            }}
          />
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%)" }} />

          {/* Back button */}
          <button
            onClick={goBack}
            style={{
              position: "absolute", top: "16px", left: "16px",
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
              border: "none", borderRadius: "12px", color: "white",
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            }}
          >
            <ArrowLeft style={{ width: "15px", height: "15px" }} />
            Voltar
          </button>

          {/* Fav button */}
          <button
            onClick={handleFav}
            style={{
              position: "absolute", top: "16px", right: "16px",
              background: fav ? "#fff0f5" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(6px)",
              border: "none", borderRadius: "50%",
              width: "40px", height: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Heart style={{ width: "18px", height: "18px", fill: fav ? "#e91e63" : "none", stroke: fav ? "#e91e63" : "#888" }} />
          </button>

          {/* Featured badge */}
          {product.featured && (
            <div style={{
              position: "absolute", bottom: "14px", left: "16px",
              background: "#FF8A50", color: "white",
              borderRadius: "20px", padding: "4px 12px",
              fontSize: "11px", fontWeight: 700,
            }}>
              ⭐ Destaque
            </div>
          )}
        </div>

        {/* ── Product info card ── */}
        <div style={{ background: "white", borderRadius: "0 0 24px 24px", padding: "20px 20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px", lineHeight: 1.3 }}>
            {product.name}
          </h1>
          <p style={{ fontSize: "13px", color: "#666", margin: "0 0 14px", lineHeight: 1.6 }}>
            {product.description}
          </p>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "20px" }}>
            <span style={{ fontSize: "28px", fontWeight: 900, color: "#0F9D8A" }}>
              {formatPrice(product.price)}
            </span>
            {product.unit && (
              <span style={{ fontSize: "13px", color: "#999" }}>/ {product.unit}</span>
            )}
          </div>

          {/* Cart controls */}
          {inCart && cartItem ? (
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f0faf9", borderRadius: "12px", padding: "10px 16px", flex: 1 }}>
                <button
                  onClick={() => cartItem.qty === 1 ? removeItem(product.id) : updateQty(product.id, cartItem.qty - 1)}
                  style={{ background: "white", border: "1.5px solid #ddd", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <Minus style={{ width: "13px", height: "13px" }} />
                </button>
                <span style={{ fontWeight: 800, fontSize: "16px", color: "#0F9D8A", minWidth: "20px", textAlign: "center" }}>{cartItem.qty}</span>
                <button
                  onClick={() => updateQty(product.id, cartItem.qty + 1)}
                  style={{ background: "#0F9D8A", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <Plus style={{ width: "13px", height: "13px", color: "white" }} />
                </button>
              </div>
              <button
                onClick={() => setOrderOpen(true)}
                style={{ background: "#25D366", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "14px", padding: "0 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <MessageCircle style={{ width: "16px", height: "16px" }} />
                Pedir
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <button
                onClick={handleAdd}
                style={{
                  flex: 1, background: justAdded ? "#0F9D8A" : "#f0faf9",
                  border: "none", borderRadius: "12px", color: justAdded ? "white" : "#0F9D8A",
                  fontWeight: 700, fontSize: "14px", padding: "13px",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                {justAdded ? <><Check style={{ width: "16px", height: "16px" }} /> Adicionado!</> : <><ShoppingCart style={{ width: "16px", height: "16px" }} /> Adicionar ao carrinho</>}
              </button>
              <button
                onClick={() => setOrderOpen(true)}
                style={{ background: "#25D366", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "14px", padding: "13px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <MessageCircle style={{ width: "16px", height: "16px" }} />
                Pedir
              </button>
            </div>
          )}

          {/* WhatsApp direct */}
          <a
            href={buildWhatsAppLink(store.whatsapp, product.name, store.name, `${window.location.origin}/product/${store.id}/${product.id}`)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              background: "white", border: "2px solid #25D366", borderRadius: "12px",
              color: "#25D366", fontWeight: 700, fontSize: "14px", padding: "12px",
              textDecoration: "none",
            }}
          >
            <MessageCircle style={{ width: "16px", height: "16px" }} />
            Perguntar via WhatsApp
          </a>
        </div>

        {/* ── Store info ── */}
        <div style={{ margin: "16px 16px 0", background: "white", borderRadius: "16px", padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Vendido por
          </p>
          <button
            onClick={() => navigate(`/store/${store.id}`)}
            style={{ display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left", padding: 0 }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
              <img src={store.imageUrl} alt={store.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=60"; }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", margin: "0 0 2px" }}>{store.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {catData && (
                  <span style={{ background: "#f0faf9", color: "#0B7A6E", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>
                    {catData.icon} {catData.label}
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: "#666" }}>
                  <Star style={{ width: "12px", height: "12px", fill: "#FBBF24", color: "#FBBF24" }} />
                  {store.rating?.toFixed(1) ?? "—"}
                </span>
                {locLabel && (
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#999" }}>
                    <MapPin style={{ width: "10px", height: "10px" }} />
                    {locLabel}
                  </span>
                )}
              </div>
            </div>
            <StoreIcon style={{ width: "18px", height: "18px", color: "#0F9D8A", flexShrink: 0 }} />
          </button>
        </div>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <div style={{ margin: "16px 16px 0" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Mais desta loja
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {related.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/product/${store.id}/${p.id}`)}
                  style={{ background: "white", border: "1.5px solid #E8F0EE", borderRadius: "14px", overflow: "hidden", textAlign: "left", cursor: "pointer", padding: 0 }}
                >
                  <div style={{ height: "90px", background: "#f0f0f0" }}>
                    <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=60"; }} />
                  </div>
                  <div style={{ padding: "10px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</p>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#0F9D8A", margin: 0 }}>{formatPrice(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <OrderModal
        product={orderOpen ? orderProduct : null}
        onClose={() => setOrderOpen(false)}
      />
    </>
  );
}
