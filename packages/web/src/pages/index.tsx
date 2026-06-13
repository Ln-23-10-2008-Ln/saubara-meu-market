import { useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  MapPin, Search, ChevronRight, Star, MessageCircle,
  ShoppingBag, Shield, ChevronDown, User, Store, LogIn, HeadphonesIcon, ShoppingCart, X,
} from "lucide-react";
import { useCart } from "../lib/cart";

import { categories } from "../lib/data";
import { useStores } from "../lib/store-resolver";
import { formatPrice, buildWhatsAppLink, formatRating } from "../lib/utils";
import { useAuth, LOCALIDADES, type Localidade } from "../lib/auth";

// ─── Category background colors (solid, vibrant) ──────────────────────────────
const CAT_BG: Record<string, string> = {
  construcao:  "bg-stone-500",
  informatica: "bg-indigo-500",
  celulares:   "bg-blue-500",
  moda:        "bg-pink-500",
  cosmeticos:  "bg-rose-500",
  papelaria:   "bg-yellow-500",
  utilidades:  "bg-orange-500",
  artesanato:  "bg-amber-500",
  servicos:    "bg-purple-500",
};

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { totalQty } = useCart();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showAllStores, setShowAllStores] = useState(false);
  const [activeLocalidade, setActiveLocalidade] = useState<Localidade | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Unified store data ───────────────────────────────────────────────────
  const { activeStores: stores, featuredStores, featuredProducts } = useStores();

  // Commit search → navigate to /search?q=...&loc=... (pass active localidade)
  const commitSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (q) {
      const locParam = activeLocalidade ? `&loc=${encodeURIComponent(activeLocalidade)}` : "";
      navigate(`/search?q=${encodeURIComponent(q)}${locParam}`);
    }
  }, [searchQuery, activeLocalidade, navigate]);

  const clearSearch = () => {
    setSearchQuery("");
    setShowAllStores(false);
  };

  // ─── Filter stores by category + localidade ──────────────────────────────
  const filteredStores = stores.filter((s) => {
    const matchCat = !activeCategory || s.category === activeCategory;
    const matchLoc = !activeLocalidade ||
      s.localidade === activeLocalidade ||
      s.deliveryConfig?.serviceArea?.includes(activeLocalidade);
    return matchCat && matchLoc;
  });

  const visibleStores = showAllStores ? filteredStores : filteredStores.slice(0, 6);

  // ─── Helper: does a store match the active localidade? ───────────────────
  const storeMatchesLoc = (s: typeof stores[0]) =>
    !activeLocalidade ||
    s.localidade === activeLocalidade ||
    s.deliveryConfig?.serviceArea?.includes(activeLocalidade);

  // ─── Toggle category inline + scroll to stores ───────────────────────────
  const selectCategory = (catId: string | null) => {
    setActiveCategory(catId);
    setShowAllStores(false);
    setTimeout(() => {
      document.getElementById("todas-as-lojas")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // ─── Offer products — filtered by localidade ─────────────────────────────
  const offerProducts = stores
    .filter(storeMatchesLoc)
    .flatMap((s) =>
      s.products
        .filter((p) => p.featured)
        .map((p) => ({ ...p, storeName: s.name, storeId: s.id, storeWhatsapp: s.whatsapp }))
    )
    .slice(0, 12);

  // ─── "Mais Pedidos" — filtered by localidade ─────────────────────────────
  const maisPedidos = stores
    .filter(storeMatchesLoc)
    .flatMap((s) =>
      s.products
        .filter((p) => !p.featured)
        .map((p) => ({ ...p, storeName: s.name, storeId: s.id, storeWhatsapp: s.whatsapp }))
    )
    .slice(0, 12);

  return (
    <div
      className="min-h-screen bg-[#F4F6F5]"
      style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}
    >
      {/* ═══════════════ STICKY HEADER ═══════════════════════════════════════ */}
      {/*
        bg-[#0B7A6E] = versão 10% mais escura que #0F9D8A — garante contraste
        mínimo 4.5:1 de texto branco sobre o fundo mesmo em telas OLED.
        Nenhum elemento usa opacity parcial para cor de texto.
      */}
      <header className="sticky top-0 z-50 shadow-xl" style={{ backgroundColor: "#0B7A6E" }}>

        {/* ── Linha 1: logo + localização + botões de auth ─────────────────── */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2.5">

          {/* Logo — ícone branco em fundo levemente escurecido */}
          <div className="flex-shrink-0 flex items-center gap-2 mr-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#0F9D8A" }}>
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none hidden xs:block sm:block">
              <p className="text-white font-bold text-sm leading-tight tracking-tight">Saubara</p>
              <p className="font-semibold text-[10px] leading-tight" style={{ color: "#A7DDD8" }}>Meu Market</p>
            </div>
          </div>

          {/* Localização */}
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#FFB347" }} />
            <span className="text-white font-semibold text-xs truncate hidden sm:block">Saubara, BA</span>
          </div>

          {/* Botões de autenticação — todos com fundo sólido */}
          <div className="flex-shrink-0 flex items-center gap-1.5">

            {/* Carrinho — sempre visível com contador */}
            <button
              onClick={() => navigate("/cart")}
              className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-all"
              title="Ver carrinho"
            >
              <ShoppingCart className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              {totalQty > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center text-white font-extrabold rounded-full"
                  style={{
                    background: "#FF8A50",
                    fontSize: 9,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    lineHeight: 1,
                  }}
                >
                  {totalQty > 99 ? "99+" : totalQty}
                </span>
              )}
            </button>

            {user ? (
              /* Logged in: show profile button */
              <button
                onClick={() => navigate(user.type === "seller" ? "/dashboard/seller" : "/dashboard/client")}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-100 active:scale-95 transition-all text-xs font-bold px-3 py-2 rounded-full shadow-sm"
                style={{ color: "#0B7A6E" }}
              >
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </button>
            ) : (
              <>
                {/* Entrar — fundo branco, texto escuro */}
                <button
                  onClick={() => navigate("/auth/login")}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-100 active:scale-95 transition-all text-xs font-bold px-3 py-2 rounded-full shadow-sm"
                  style={{ color: "#0B7A6E" }}
                >
                  <LogIn className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Entrar</span>
                </button>

                {/* Cadastrar-se — borda branca, texto branco */}
                <button
                  onClick={() => navigate("/auth/register")}
                  className="flex items-center gap-1.5 bg-transparent border-2 border-white hover:bg-white/10 active:scale-95 transition-all text-white text-xs font-bold px-3 py-1.5 rounded-full"
                >
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Cadastrar</span>
                </button>
              </>
            )}

            {/* Quero Vender — laranja sólido, máximo destaque */}
            <button
              onClick={() => navigate("/auth/register?type=seller")}
              className="flex items-center gap-1.5 active:scale-95 transition-all text-white text-xs font-bold px-3 py-2 rounded-full shadow-md"
              style={{ backgroundColor: "#FF8A50" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#e8540a")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FF8A50")}
            >
              <Store className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Vender</span>
            </button>
          </div>
        </div>

        {/* ── Linha 2: campo de busca — fundo branco sólido 100% ───────────── */}
        <div className="px-4 pb-3">
          <div className="flex items-center bg-white rounded-xl shadow overflow-hidden"
               style={{ outline: searchQuery ? "2px solid #FF8A50" : "2px solid transparent" }}
          >
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar lojas, produtos, categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitSearch(); } }}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none font-medium px-2 py-2.5"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={commitSearch}
              className="flex items-center gap-1.5 px-3 py-2.5 font-bold text-xs text-white flex-shrink-0"
              style={{ background: "#FF8A50" }}
              title="Pesquisar"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </div>

        {/* ── Linha 3: categorias — ícones com fundo sólido, label branco puro ── */}
        <div className="pb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2.5 px-4" style={{ width: "max-content" }}>

            {/* "Todos" */}
            <button
              onClick={() => selectCategory(null)}
              className="flex-shrink-0 flex flex-col items-center gap-1 transition-all active:scale-95"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow"
                style={{
                  backgroundColor: !activeCategory ? "#ffffff" : "#0F9D8A",
                  border: !activeCategory ? "2.5px solid #ffffff" : "2.5px solid rgba(255,255,255,0.4)",
                }}
              >
                🏪
              </div>
              <span className="text-white font-bold text-[10px] leading-tight" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                Todos
              </span>
            </button>

            {categories.map((cat) => {
              const solidBg: Record<string, string> = {
                construcao:  "#78716C",
                informatica: "#6366F1",
                celulares:   "#3B82F6",
                moda:        "#EC4899",
                cosmeticos:  "#F43F5E",
                papelaria:   "#EAB308",
                utilidades:  "#F97316",
                artesanato:  "#D97706",
                servicos:    "#A855F7",
              };
              const bg = solidBg[cat.id] ?? "#6B7280";
              return (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 transition-all active:scale-95"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow"
                    style={{
                      backgroundColor: bg,
                      border: activeCategory === cat.id ? "2.5px solid #ffffff" : "2.5px solid rgba(255,255,255,0.25)",
                      outline: activeCategory === cat.id ? "2px solid rgba(255,255,255,0.5)" : "none",
                      transition: "all 0.15s ease",
                      transform: activeCategory === cat.id ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {cat.icon}
                  </div>
                  <span
                    className="font-bold text-[10px] leading-tight"
                    style={{
                      color: activeCategory === cat.id ? "#FFE082" : "#ffffff",
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    {cat.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Linha 4: Filtro por localidade ────────────────────────────────── */}
        <div className="pb-2.5 overflow-x-auto no-scrollbar border-t border-white/10">
          <div className="flex gap-2 px-4 pt-2" style={{ width: "max-content" }}>
            <button
              onClick={() => { setActiveLocalidade(null); setShowAllStores(false); }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
              style={{
                background: !activeLocalidade ? "white" : "rgba(255,255,255,0.18)",
                color: !activeLocalidade ? "#0B7A6E" : "white",
                border: !activeLocalidade ? "none" : "1.5px solid rgba(255,255,255,0.4)",
              }}
            >
              📍 Todas
            </button>
            {LOCALIDADES.map((loc) => {
              const active = activeLocalidade === loc.value;
              return (
                <button
                  key={loc.value}
                  onClick={() => { setActiveLocalidade(active ? null : loc.value); setShowAllStores(false); }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: active ? "white" : "rgba(255,255,255,0.18)",
                    color: active ? "#0B7A6E" : "white",
                    border: active ? "none" : "1.5px solid rgba(255,255,255,0.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══════════════ CONTENT (max-width for desktop) ══════════════════════ */}
      <div className="max-w-[900px] mx-auto">

      {/* ═══════════════ HERO BANNER ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: 300 }}>
        {/* Background image */}
        <img
          src="/hero-saubara.jpg"
          alt="Saubara"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%" }}
          {...{ fetchPriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=900&q=70";
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(105deg, rgba(11,46,43,0.93) 0%, rgba(11,78,70,0.78) 45%, rgba(15,157,138,0.38) 100%)"
        }} />
        {/* Decorative glows */}
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(15,157,138,0.22) 0%, transparent 70%)" }} />
        <div className="absolute -right-4 bottom-0 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,138,80,0.15) 0%, transparent 70%)" }} />

        {/* Content */}
        <div className="relative z-10 px-5 pt-7 pb-7 flex flex-col gap-4">

          {/* Eyebrow */}
          <span className="self-start flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full"
            style={{ background: "rgba(255,138,80,0.2)", color: "#FFB347", border: "1px solid rgba(255,138,80,0.32)" }}>
            <MapPin className="w-3 h-3" /> Saubara · Bahia
          </span>

          {/* Headline */}
          <div>
            <h1 className="text-white font-black leading-tight mb-2"
              style={{ fontSize: "clamp(22px, 6vw, 32px)", textShadow: "0 2px 16px rgba(0,0,0,0.5)", letterSpacing: "-0.5px" }}>
              O mercado da<br />
              nossa cidade,<br />
              <span style={{ color: "#FF8A50" }}>na sua mão.</span>
            </h1>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>
              Compre de lojas locais via WhatsApp.<br />Rápido, direto e sem taxas.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowAllStores(true);
                setTimeout(() => {
                  document.getElementById("todas-as-lojas")?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
              className="flex-1 flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-2xl active:scale-95 transition-all"
              style={{
                background: "linear-gradient(135deg, #FF8A50, #e8540a)",
                color: "#fff",
                boxShadow: "0 6px 20px rgba(255,138,80,0.45)",
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              Comprar agora
            </button>
            <button
              onClick={() => navigate("/auth/register?type=seller")}
              className="flex-1 flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-2xl active:scale-95 transition-all"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Store className="w-4 h-4" />
              Quero vender
            </button>
          </div>

          {/* Stats strip */}
          <div className="flex gap-6 pt-1">
            {[
              { value: `${stores.length}+`, label: "lojas" },
              { value: "0%", label: "taxa" },
              { value: "24h", label: "entrega" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-black text-xl leading-tight" style={{ color: "#FF8A50" }}>{s.value}</span>
                <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST CARDS ══════════════════════════════════════════ */}
      <section style={{ background: "#fff", borderBottom: "1px solid #E8F0EE" }}>
        <div className="px-4 py-5 grid grid-cols-3 gap-3">
          {[
            {
              icon: "💬",
              color: "#0F9D8A",
              lightBg: "#E8F7F5",
              title: "WhatsApp Direto",
              desc: "Peça sem intermediários",
            },
            {
              icon: "🏘️",
              color: "#1565C0",
              lightBg: "#E3F2FD",
              title: "Comércio Local",
              desc: "Apoie quem é daqui",
            },
            {
              icon: "🔒",
              color: "#2E7D32",
              lightBg: "#E8F5E9",
              title: "Compra Segura",
              desc: "Comércio verificado",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="flex flex-col items-center text-center gap-2.5 py-4 px-2 rounded-2xl"
              style={{ background: c.lightBg }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ background: c.color }}
              >
                <span style={{ fontSize: 24 }}>{c.icon}</span>
              </div>
              <div>
                <p className="font-bold text-[11px] leading-tight" style={{ color: "#1a1a1a" }}>{c.title}</p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: "#666" }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-2 bg-[#E8F0EE] -mx-0" />

      {/* ═══════════════ OFERTAS ══════════════════════════════════════════════ */}
      {offerProducts.length > 0 && (
        <section className="py-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-gray-900 font-bold text-base flex items-center gap-1.5">
              🔥 Ofertas em destaque
            </h2>
            <button className="text-[#0F9D8A] text-xs font-semibold flex items-center gap-0.5">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 px-4" style={{ width: "max-content" }}>
              {offerProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/product/${p.storeId}/${p.id}`)}
                  className="flex-shrink-0 w-36 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=60";
                      }}
                    />
                    <span className="absolute top-1.5 left-1.5 bg-[#FF8A50] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      OFERTA
                    </span>
                  </div>
                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <p className="text-gray-900 font-semibold text-xs leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-gray-400 text-[10px] truncate">{p.storeName}</p>
                    <p className="text-[#0F9D8A] font-bold text-sm">{formatPrice(p.price)}</p>
                    <a
                      href={buildWhatsAppLink(p.storeWhatsapp, p.name, p.storeName, `${window.location.origin}/store/${p.storeId}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-auto flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1ebe5a] active:scale-95 transition-all text-white text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      <MessageCircle className="w-3 h-3" /> Pedir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-2 bg-[#E8F0EE]" />

      {/* ═══════════════ LOJAS EM DESTAQUE ════════════════════════════════════ */}
      {featuredStores.length > 0 && (
        <section className="py-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-gray-900 font-bold text-base">⭐ Lojas em destaque</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            {featuredStores.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate(`/store/${store.id}`)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col text-left active:scale-95 transition-transform"
              >
                <div className="relative h-24 bg-gray-100">
                  <img
                    src={store.imageUrl}
                    alt={store.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=60";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 text-white text-[9px] font-bold bg-[#0F9D8A] px-1.5 py-0.5 rounded-full">
                    {categories.find((c) => c.id === store.category)?.icon}{" "}
                    {categories.find((c) => c.id === store.category)?.label.split(" ")[0]}
                  </span>
                </div>
                <div className="p-2.5 flex flex-col gap-1">
                  <p className="text-gray-900 font-bold text-xs leading-tight line-clamp-1">{store.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-gray-700 text-[11px] font-semibold">{formatRating(store.rating)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-2 bg-[#E8F0EE]" />

      {/* ═══════════════ MAIS PEDIDOS ═════════════════════════════════════════ */}
      {maisPedidos.length > 0 && (
        <section className="py-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-gray-900 font-bold text-base">🛒 Mais pedidos</h2>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-3 px-4" style={{ width: "max-content" }}>
              {maisPedidos.map((p) => (
                <div
                  key={`${p.storeId}-${p.id}`}
                  onClick={() => navigate(`/product/${p.storeId}/${p.id}`)}
                  className="flex-shrink-0 w-36 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="aspect-[4/3] bg-gray-100">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=60";
                      }}
                    />
                  </div>
                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <p className="text-gray-900 font-semibold text-xs leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-gray-400 text-[10px] truncate">{p.storeName}</p>
                    <p className="text-[#0F9D8A] font-bold text-sm">{formatPrice(p.price)}</p>
                    <a
                      href={buildWhatsAppLink(p.storeWhatsapp, p.name, p.storeName, `${window.location.origin}/store/${p.storeId}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-auto flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1ebe5a] active:scale-95 transition-all text-white text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      <MessageCircle className="w-3 h-3" /> Pedir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-2 bg-[#E8F0EE]" />

      {/* ═══════════════ TODAS AS LOJAS ═══════════════════════════════════════ */}
      <section id="todas-as-lojas" className="py-4">
        {/* Active localidade banner */}
        {activeLocalidade && (
          <div className="mx-4 mb-3 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2"
               style={{ background: "linear-gradient(90deg,#0F9D8A,#0B7A6E)", color: "white" }}>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-bold">
                {LOCALIDADES.find(l => l.value === activeLocalidade)?.label}
              </span>
              <span className="text-[10px] opacity-80">· {filteredStores.length} loja{filteredStores.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={() => setActiveLocalidade(null)}
              className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full active:scale-95"
            >
              Limpar ✕
            </button>
          </div>
        )}
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-gray-900 font-bold text-base">
            🏪 {activeCategory && !activeLocalidade
              ? `${categories.find(c => c.id === activeCategory)?.label ?? "Categoria"}`
              : activeLocalidade && !activeCategory
              ? `Lojas em ${LOCALIDADES.find(l => l.value === activeLocalidade)?.label}`
              : activeCategory && activeLocalidade
              ? `${categories.find(c => c.id === activeCategory)?.label} em ${LOCALIDADES.find(l => l.value === activeLocalidade)?.label}`
              : "Todas as lojas"}
            {(activeCategory || activeLocalidade) && (
              <span className="ml-2 text-xs text-[#0F9D8A] font-medium">
                ({filteredStores.length})
              </span>
            )}
          </h2>
          {(activeCategory || activeLocalidade) && (
            <button
              onClick={() => { setActiveLocalidade(null); setActiveCategory(null); setShowAllStores(false); }}
              className="text-gray-400 text-xs font-medium"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {filteredStores.length === 0 ? (
          <div className="mx-4 py-10 bg-white rounded-2xl flex flex-col items-center gap-2 text-center">
            <span className="text-4xl">🏘️</span>
            <p className="text-gray-700 font-bold text-sm">
              {activeLocalidade
                ? `Nenhuma loja em ${LOCALIDADES.find(l => l.value === activeLocalidade)?.label ?? activeLocalidade} ainda`
                : "Nenhuma loja encontrada"}
            </p>
            <p className="text-gray-400 text-xs">
              {activeLocalidade
                ? "Em breve comerciantes desta localidade estarão aqui. Tente outra localidade."
                : "Tente outro filtro ou busca"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4">
            {visibleStores.map((store) => {
              const catData = categories.find((c) => c.id === store.category);
              const catBg = CAT_BG[store.category] ?? "bg-gray-500";
              return (
                <button
                  key={store.id}
                  onClick={() => navigate(`/store/${store.id}`)}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden flex items-stretch text-left active:scale-[0.98] transition-transform"
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 flex-shrink-0 bg-gray-100">
                    <img
                      src={store.imageUrl}
                      alt={store.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=60";
                      }}
                    />
                  </div>
                  {/* Info */}
                  <div className="flex-1 p-3 flex flex-col justify-between gap-1 min-w-0">
                    <div>
                      <p className="text-gray-900 font-bold text-sm leading-tight line-clamp-1">{store.name}</p>
                      <p className="text-gray-500 text-xs leading-tight mt-0.5 line-clamp-2">{store.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {/* Category badge */}
                      <span className={`flex items-center gap-1 ${catBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                        {catData?.icon} {catData?.label.split(" ")[0]}
                      </span>
                      {/* Localidade badge */}
                      {store.neighborhood && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "#e8f7f5", color: "#0B7A6E" }}>
                          <MapPin className="w-2.5 h-2.5" />{store.neighborhood.replace(" de Saubara","").replace("Sede","Sede")}
                        </span>
                      )}
                      {/* Rating */}
                      <span className="flex items-center gap-0.5 text-[11px] text-gray-600 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {formatRating(store.rating)}
                      </span>
                    </div>
                  </div>
                  {/* WA icon */}
                  <div className="flex-shrink-0 flex items-center pr-3">
                    <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Show more / less */}
            {filteredStores.length > 6 && (
              <button
                onClick={() => setShowAllStores(!showAllStores)}
                className="w-full py-3 rounded-2xl border-2 border-[#0F9D8A] text-[#0F9D8A] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                {showAllStores ? "Mostrar menos" : `Ver mais ${filteredStores.length - 6} lojas`}
                <ChevronDown className={`w-4 h-4 transition-transform ${showAllStores ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ─── Divider ──────────────────────────────────────────────────────── */}
      <div className="h-2 bg-[#E8F0EE]" />

      {/* ═══════════════ CTA COMERCIANTES ═════════════════════════════════════ */}
      <section className="mx-4 my-5 rounded-3xl overflow-hidden shadow-lg">
        <div
          className="relative p-6"
          style={{ background: "linear-gradient(135deg, #FF8A50 0%, #e8540a 100%)" }}
        >
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-16 h-16 bg-white/10 rounded-full translate-y-6 pointer-events-none" />

          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
              <Store className="w-4 h-4 text-white" />
            </div>
            <p className="text-white text-xs font-bold uppercase tracking-wide">Para comerciantes</p>
          </div>

          <h3 className="text-white font-bold text-xl leading-tight mb-2">
            Tem um negócio em Saubara?<br />
            Cadastre sua loja gratuitamente.
          </h3>
          <p className="text-white text-sm mb-5 leading-relaxed font-medium" style={{ opacity: 0.95 }}>
            Apareça para centenas de moradores locais e receba pedidos direto no seu WhatsApp — sem taxas, sem comissão.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => navigate("/auth/register?type=seller")}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all text-[#e8540a] font-bold text-sm px-5 py-3 rounded-2xl shadow"
            >
              <Store className="w-4 h-4" />
              Cadastrar minha loja
            </button>
            <a
              href="https://wa.me/5571991110000?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20Saubara%20Meu%20Market%20para%20comerciantes."
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] active:scale-[0.98] transition-all text-white font-bold text-sm px-5 py-3 rounded-2xl shadow"
            >
              <MessageCircle className="w-4 h-4" />
              Tirar dúvidas
            </a>
          </div>

          {/* Trust micro-line */}
          <p className="text-white text-[11px] mt-3 text-center font-medium" style={{ opacity: 0.85 }}>
            ✓ Sem taxa de adesão &nbsp;·&nbsp; ✓ Sem comissão &nbsp;·&nbsp; ✓ Ativação rápida
          </p>
        </div>
      </section>

      </div>{/* end max-w content wrapper */}

      {/* ═══════════════ FOOTER ═══════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-white px-5 pt-6 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-[#0F9D8A] rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Saubara Meu Market</p>
            <p className="text-gray-400 text-[11px]">O mercado digital de Saubara</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed mb-4">
          Plataforma gratuita que conecta moradores de Saubara, BA aos comércios locais via WhatsApp.
        </p>
        <div className="flex items-center gap-1 text-gray-300 text-[11px] mb-4">
          <MapPin className="w-3 h-3" />
          <span>Saubara, Bahia, Brasil</span>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Link to="/suporte">
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors">
              <HeadphonesIcon className="w-3.5 h-3.5 text-[#0F9D8A]" />
              Central de Atendimento
            </button>
          </Link>
          <Link to="/cart">
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors">
              <ShoppingBag className="w-3.5 h-3.5 text-[#FF8A50]" />
              Meu Carrinho
            </button>
          </Link>
        </div>

        <div className="mt-0 pt-4 border-t border-gray-700 text-gray-400 text-[10px] text-center flex flex-col items-center gap-2">
          <span>© 2025 Saubara Meu Market · Feito com ❤️ para a comunidade</span>
          <button
            onClick={() => {
              localStorage.removeItem("smm_splash_seen_v1");
              window.location.reload();
            }}
            className="text-[10px] text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
          >
            Ver apresentação novamente
          </button>
        </div>
      </footer>

      {/* ═══════════════ NO-SCROLLBAR STYLE ══════════════════════════════════ */}
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
        .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      `}</style>
    </div>
  );
}
