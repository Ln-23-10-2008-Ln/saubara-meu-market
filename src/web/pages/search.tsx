import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { smartBack } from "../lib/navigation";
import {
  Search, MapPin, Star, MessageCircle, ArrowLeft, ShoppingBag, Store as StoreIcon, Tag,
} from "lucide-react";
import { categories } from "../lib/data";
import { useStores } from "../lib/store-resolver";
import { formatPrice, buildWhatsAppLink, formatRating } from "../lib/utils";
import { LOCALIDADES, type Localidade } from "../lib/auth";

// ─── Parse query params via wouter useSearch ──────────────────────────────────
function useSearchParams(): { query: string; localidade: Localidade | null } {
  const search = useSearch();
  try {
    const params = new URLSearchParams(search);
    const q = params.get("q")?.trim() ?? "";
    const loc = (params.get("loc")?.trim() ?? "") as Localidade | "";
    const validLoc = LOCALIDADES.find((l) => l.value === loc)?.value ?? null;
    return { query: q, localidade: validLoc as Localidade | null };
  } catch {
    return { query: "", localidade: null };
  }
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const { query, localidade: filterLocalidade } = useSearchParams();
  const q = query.toLowerCase();
  const { activeStores: stores } = useStores();

  // ─── Helper: does a store serve the filtered localidade? ─────────────────
  const storeServesLoc = (s: typeof stores[0]) =>
    !filterLocalidade ||
    s.localidade === filterLocalidade ||
    s.deliveryConfig?.serviceArea?.includes(filterLocalidade);

  // ─── Search logic ──────────────────────────────────────────────────────────
  const { matchedStores, matchedProducts, matchedCategories } = useMemo(() => {
    if (!q) return { matchedStores: [], matchedProducts: [], matchedCategories: [] };

    // Pool of stores to search — filtered by localidade if set
    const storePool = stores.filter(storeServesLoc);

    // Categories that match
    const matchedCategories = categories.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
    const matchedCatIds = new Set(matchedCategories.map((c) => c.id));

    // Stores: name, description, longDescription, category match
    const matchedStores = storePool.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.longDescription ?? "").toLowerCase().includes(q) ||
        matchedCatIds.has(s.category) ||
        (s.neighborhood ?? "").toLowerCase().includes(q)
    );
    const matchedStoreIds = new Set(matchedStores.map((s) => s.id));

    // Products: name, description — from storePool only
    const matchedProducts = storePool.flatMap((s) =>
      s.products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        )
        .map((p) => ({
          ...p,
          storeName: s.name,
          storeId: s.id,
          storeWhatsapp: s.whatsapp,
          storeCategory: s.category,
          storeLocalidade: s.localidade,
        }))
    );

    // Add stores that have matching products (if not already included)
    matchedProducts.forEach((p) => {
      if (!matchedStoreIds.has(p.storeId)) {
        const s = storePool.find((st) => st.id === p.storeId);
        if (s) {
          matchedStores.push(s);
          matchedStoreIds.add(s.id);
        }
      }
    });

    return { matchedStores, matchedProducts, matchedCategories };
  }, [q, filterLocalidade, stores]);

  const totalResults = matchedStores.length + matchedProducts.length;
  const hasResults = totalResults > 0;
  const locLabel = filterLocalidade ? LOCALIDADES.find((l) => l.value === filterLocalidade)?.label : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F7FAF9", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #0F9D8A 0%, #0B7A6E 100%)", paddingBottom: "0" }}>
        <div style={{ padding: "12px 16px 0" }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <button
              onClick={() => smartBack(navigate)}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <span style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>Busca</span>
          </div>

          {/* Search bar (read-only, tap to go back and search again) */}
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              marginBottom: "16px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          >
            <Search style={{ width: "16px", height: "16px", color: "#0F9D8A", flexShrink: 0 }} />
            <span style={{ fontSize: "14px", color: query ? "#1a1a1a" : "#999", flex: 1 }}>
              {query || "Buscar lojas e produtos..."}
            </span>
            {query && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate("/"); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <span style={{ fontSize: "18px", color: "#aaa", lineHeight: 1 }}>×</span>
              </button>
            )}
          </div>
        </div>

        {/* Result count + localidade filter badge */}
        {query && (
          <div style={{
            background: "rgba(0,0,0,0.15)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}>
            <Search style={{ width: "12px", height: "12px", color: "rgba(255,255,255,0.8)", flexShrink: 0 }} />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>
              {hasResults
                ? `${totalResults} resultado${totalResults !== 1 ? "s" : ""} para `
                : "Nenhum resultado para "}
              <strong style={{ color: "white" }}>"{query}"</strong>
            </span>
            {locLabel && (
              <span style={{
                background: "rgba(255,255,255,0.22)",
                color: "white",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}>
                <MapPin style={{ width: "9px", height: "9px" }} />
                {locLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "16px 16px 100px" }}>

        {/* ── Empty / no query ── */}
        {!query && (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>🔍</div>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#333" }}>O que você está procurando?</p>
            <p style={{ fontSize: "13px", color: "#888", marginTop: "6px" }}>
              Busque lojas, produtos ou categorias
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: "20px",
                background: "#0F9D8A",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "10px 24px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Ir para o início
            </button>
          </div>
        )}

        {/* ── No results ── */}
        {query && !hasResults && (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>😕</div>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#333" }}>Nenhum resultado</p>
            <p style={{ fontSize: "13px", color: "#888", marginTop: "6px", maxWidth: "260px", margin: "6px auto 0" }}>
              Não encontramos lojas nem produtos para <strong>"{query}"</strong>. Tente outro termo.
            </p>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/")}
                style={{
                  background: "#0F9D8A",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Ver todas as lojas
              </button>
            </div>

            {/* Suggest categories */}
            <div style={{ marginTop: "32px", textAlign: "left" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Navegue por categoria
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => navigate(`/category/${cat.id}`)}
                    style={{
                      background: "white",
                      border: "1.5px solid #E8F0EE",
                      borderRadius: "20px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#444",
                      cursor: "pointer",
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Category matches banner ── */}
        {query && matchedCategories.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              <Tag style={{ width: "11px", height: "11px", display: "inline", marginRight: "4px" }} />
              Categorias
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {matchedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/category/${cat.id}`)}
                  style={{
                    background: "white",
                    border: "2px solid #0F9D8A",
                    borderRadius: "20px",
                    padding: "7px 16px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0F9D8A",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Store results ── */}
        {query && matchedStores.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              <StoreIcon style={{ width: "11px", height: "11px", display: "inline", marginRight: "4px" }} />
              Lojas ({matchedStores.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {matchedStores.map((store) => {
                const catData = categories.find((c) => c.id === store.category);
                const locLabel = LOCALIDADES.find((l) => l.value === store.localidade)?.label ?? store.neighborhood ?? "";
                return (
                  <button
                    key={store.id}
                    onClick={() => navigate(`/store/${store.id}`)}
                    style={{
                      background: "white",
                      border: "1.5px solid #E8F0EE",
                      borderRadius: "16px",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "stretch",
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Thumb */}
                    <div style={{ width: "80px", flexShrink: 0, background: "#f0f0f0", position: "relative" }}>
                      <img
                        src={store.imageUrl}
                        alt={store.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=60";
                        }}
                      />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a1a", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {store.name}
                      </p>
                      <p style={{ fontSize: "12px", color: "#666", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {store.description}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                        {catData && (
                          <span style={{
                            background: "#f0faf9",
                            color: "#0B7A6E",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                          }}>
                            {catData.icon} {catData.label}
                          </span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", color: "#888" }}>
                          <Star style={{ width: "11px", height: "11px", fill: "#FBBF24", color: "#FBBF24" }} />
                          {formatRating(store.rating)}
                        </span>
                        {locLabel && (
                          <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px", color: "#999" }}>
                            <MapPin style={{ width: "9px", height: "9px" }} />
                            {locLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Arrow */}
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", paddingRight: "12px" }}>
                      <div style={{ width: "28px", height: "28px", background: "#25D366", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageCircle style={{ width: "13px", height: "13px", color: "white" }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Product results ── */}
        {query && matchedProducts.length > 0 && (
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              <ShoppingBag style={{ width: "11px", height: "11px", display: "inline", marginRight: "4px" }} />
              Produtos ({matchedProducts.length})
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {matchedProducts.map((p) => (
                <div
                  key={`${p.storeId}-${p.id}`}
                  onClick={() => navigate(`/product/${p.storeId}/${p.id}`)}
                  style={{
                    background: "white",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1.5px solid #E8F0EE",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                  }}
                >
                  {/* Image */}
                  <div style={{ height: "110px", background: "#f0f0f0" }}>
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=60";
                      }}
                    />
                  </div>
                  {/* Info */}
                  <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1a1a", margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.name}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/store/${p.storeId}`); }}
                      style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                    >
                      <p style={{ fontSize: "10px", color: "#0F9D8A", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.storeName}
                      </p>
                    </button>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#0F9D8A", margin: "2px 0 0" }}>
                      {formatPrice(p.price)}
                    </p>
                    <a
                      href={buildWhatsAppLink(
                        p.storeWhatsapp,
                        p.name,
                        p.storeName,
                        `${window.location.origin}/store/${p.storeId}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: "auto",
                        background: "#25D366",
                        color: "white",
                        borderRadius: "8px",
                        padding: "7px",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle style={{ width: "11px", height: "11px" }} />
                      Pedir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
