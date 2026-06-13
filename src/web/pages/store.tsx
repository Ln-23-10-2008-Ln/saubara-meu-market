import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { smartBack } from "../lib/navigation";
import { categories } from "../lib/data";
import { resolveStores } from "../lib/store-resolver";
import ProductCard from "../components/ProductCard";
import OrderModal, { type OrderProduct } from "../components/OrderModal";
import { buildStoreWhatsAppLink, formatRating, formatPrice } from "../lib/utils";
import { useCart } from "../lib/cart";
import { useFavorites } from "../lib/favorites";
import { LOCALIDADES } from "../lib/auth";
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  MessageCircle,
  Search,
  X,
  Flame,
  Package,
  Phone,
  BadgeCheck,
  CalendarDays,
  ShieldCheck,
  Tag,
  Truck,
  Store,
  Heart,
  ShoppingCart,
} from "lucide-react";

// ── Colour maps ────────────────────────────────────────────────────────────────
const catBg: Record<string, string> = {
  construcao:  "bg-stone-100 text-stone-700",
  informatica: "bg-indigo-100 text-indigo-700",
  celulares:   "bg-blue-100 text-blue-700",
  moda:        "bg-pink-100 text-pink-700",
  cosmeticos:  "bg-rose-100 text-rose-700",
  papelaria:   "bg-yellow-100 text-yellow-700",
  utilidades:  "bg-orange-100 text-orange-700",
  artesanato:  "bg-amber-100 text-amber-700",
  servicos:    "bg-purple-100 text-purple-700",
};

const catGradient: Record<string, string> = {
  construcao:  "from-stone-800 to-stone-600",
  informatica: "from-indigo-900 to-indigo-600",
  celulares:   "from-blue-900 to-blue-600",
  moda:        "from-pink-900 to-pink-600",
  cosmeticos:  "from-rose-900 to-rose-600",
  papelaria:   "from-yellow-800 to-yellow-600",
  utilidades:  "from-orange-800 to-orange-600",
  artesanato:  "from-amber-800 to-amber-600",
  servicos:    "from-purple-900 to-purple-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatJoinDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StorePage() {
  const { id } = useParams<{ id: string }>();

  // Use unified resolver — already merges static + localStorage merchant data
  const store = useMemo(() => resolveStores().find((s) => s.id === id), [id]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"todos" | "destaque">("todos");

  const filteredProducts = useMemo(() => {
    let list = store?.products ?? [];
    if (activeFilter === "destaque") list = list.filter((p) => p.featured);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [store, search, activeFilter]);

  const featuredProducts = store?.products.filter((p) => p.featured) ?? [];

  if (!store) {
    return (
      <div className="min-h-screen bg-[#F4F9F8] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl mb-2">🏪</div>
        <p className="text-gray-500 text-base font-medium">Loja não encontrada.</p>
        <Link to="/">
          <span className="text-[#0F9D8A] font-semibold cursor-pointer hover:underline">
            ← Voltar ao início
          </span>
        </Link>
      </div>
    );
  }

  const cat = categories.find((c) => c.id === store.category);
  const whatsappLink = buildStoreWhatsAppLink(store.whatsapp, store.name);
  const gradient = catGradient[store.category] ?? "from-[#0B7A6E] to-[#0F9D8A]";
  const totalProducts = store.products.length;
  const { isStoreFav, toggleStore } = useFavorites();
  const storeFav = isStoreFav(store.id);
  const { totalQty } = useCart();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#F0F6F5] pb-24">

      {/* ── Hero Cover ─────────────────────────────────────────────────────── */}
      <div className="relative h-52 sm:h-68 md:h-80 overflow-hidden">
        <img
          src={store.coverUrl}
          alt={store.name}
          className="w-full h-full object-cover"
          loading="eager"
          onError={(e) => {
            const t = e.currentTarget;
            if (!t.src.includes("unsplash")) {
              t.src = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=70";
            }
          }}
        />
        {/* Layered overlay for depth */}
        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-60`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => smartBack(navigate)}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 text-sm bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Top-right: cart + heart + featured badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2">

          {/* Cart button */}
          <button
            onClick={() => navigate("/cart")}
            className="relative flex items-center justify-center backdrop-blur-sm px-3 py-1.5 rounded-xl transition-all active:scale-90"
            style={{ background: totalQty > 0 ? "rgba(15,157,138,0.85)" : "rgba(0,0,0,0.30)" }}
            title="Ver carrinho"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            {totalQty > 0 && (
              <span className="ml-1.5 text-white text-xs font-extrabold">
                {totalQty > 99 ? "99+" : totalQty}
              </span>
            )}
          </button>

          {/* Favorite store button */}
          <button
            onClick={() => toggleStore(store.id)}
            title={storeFav ? "Remover dos favoritos" : "Favoritar loja"}
            className="flex items-center gap-1.5 text-sm backdrop-blur-sm px-3 py-1.5 rounded-xl transition-all active:scale-90"
            style={{
              background: storeFav ? "rgba(233,30,99,0.85)" : "rgba(0,0,0,0.30)",
            }}
          >
            <Heart
              className="w-4 h-4"
              style={{ fill: storeFav ? "white" : "none", stroke: "white" }}
            />
            <span className="text-white text-xs font-bold">{storeFav ? "Favoritada" : "Favoritar"}</span>
          </button>

          {store.featured && (
            <div className="flex items-center gap-1 bg-[#FF8A50] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wide">
              <BadgeCheck className="w-3 h-3" />
              Destaque
            </div>
          )}
        </div>

        {/* Store name teaser in cover (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-16 pointer-events-none">
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Vitrine Digital</p>
          <h1 className="text-white text-2xl sm:text-3xl font-black leading-tight drop-shadow-lg line-clamp-1">
            {store.name}
          </h1>
        </div>
      </div>

      {/* ── Identity Card ──────────────────────────────────────────────────── */}
      <div className="max-w-[900px] mx-auto px-4">
        <div className="relative -mt-12 z-10 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* Top accent bar */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

          <div className="p-5 sm:p-6">
            {/* Logo + Info */}
            <div className="flex gap-4 items-start">
              {/* Logo */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gray-100">
                  <img
                    src={store.imageUrl}
                    alt={`Logo ${store.name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const t = e.currentTarget;
                      if (!t.src.includes("unsplash")) {
                        t.src = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=70";
                      }
                    }}
                  />
                </div>
                {/* Verified badge on logo */}
                {store.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-[#0F9D8A] text-white rounded-full p-1 shadow-lg border-2 border-white"
                    title="Loja Verificada">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Category pill */}
                {cat && (
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${catBg[store.category] ?? "bg-gray-100 text-gray-700"} inline-block mb-1.5`}>
                    {cat.icon} {cat.label}
                  </span>
                )}

                {/* Name */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                    {store.name}
                  </h1>
                  {store.verified && (
                    <span className="flex items-center gap-1 bg-[#E6F9F6] text-[#0B7A6E] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#b3e8e1] whitespace-nowrap">
                      <ShieldCheck className="w-3 h-3" />
                      Loja Verificada
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i <= Math.round(store.rating) ? "fill-amber-400 stroke-amber-400" : "stroke-gray-300 fill-gray-100"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-amber-600">{formatRating(store.rating)}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Package className="w-3 h-3 text-[#0F9D8A]" />
                    {totalProducts} produto{totalProducts !== 1 ? "s" : ""}
                  </span>
                  {store.joinedAt && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-gray-400" />
                        Desde {formatJoinDate(store.joinedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mt-4 leading-relaxed border-l-4 border-[#0F9D8A]/30 pl-3 bg-gray-50 py-2 rounded-r-xl">
              {store.longDescription ?? store.description}
            </p>

            {/* ── Stats row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="flex flex-col items-center justify-center bg-[#F0FBF9] rounded-2xl py-3 px-2 border border-[#D0EFE9]">
                <span className="text-xl font-black text-[#0F9D8A]">{totalProducts}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5 text-center leading-tight">Produtos</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-amber-50 rounded-2xl py-3 px-2 border border-amber-100">
                <span className="text-xl font-black text-amber-600">{formatRating(store.rating)}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5 text-center leading-tight">Avaliação</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-purple-50 rounded-2xl py-3 px-2 border border-purple-100">
                {store.verified ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-[#0F9D8A]" />
                    <span className="text-[10px] text-gray-500 font-semibold mt-0.5 text-center leading-tight">Verificada</span>
                  </>
                ) : (
                  <>
                    <Store className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5 text-center leading-tight">Cadastrada</span>
                  </>
                )}
              </div>
            </div>

            {/* ── Info grid ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <MapPin className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Localização</p>
                  <p className="text-xs font-semibold text-gray-700 leading-snug">{store.address}</p>
                  {store.neighborhood && (
                    <p className="text-[10px] text-[#0F9D8A] font-medium mt-0.5">{store.neighborhood} · Saubara, BA</p>
                  )}
                </div>
              </div>
              {store.hours && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Clock className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Horário</p>
                    <p className="text-xs font-semibold text-gray-700 leading-snug">{store.hours}</p>
                  </div>
                </div>
              )}
              {store.joinedAt && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <CalendarDays className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Na Plataforma desde</p>
                    <p className="text-xs font-semibold text-gray-700">{formatJoinDate(store.joinedAt)}</p>
                  </div>
                </div>
              )}
              {cat && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Tag className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Categoria</p>
                    <p className="text-xs font-semibold text-gray-700">{cat.icon} {cat.label}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Delivery Info ───────────────────────────────────────────── */}
            {store.deliveryConfig ? (
              <div className="mt-4 bg-[#f0faf9] border border-[#c8ede9] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-[#0B7A6E]" />
                  <p className="text-xs font-extrabold text-[#0B7A6E] uppercase tracking-wide">Entrega & Retirada</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {store.deliveryConfig.ownDelivery && (
                    <span className="flex items-center gap-1 bg-white border border-[#0F9D8A] text-[#0F9D8A] text-[10px] font-bold px-2.5 py-1 rounded-full">
                      🛵 Entrega própria
                    </span>
                  )}
                  {store.deliveryConfig.pickup && (
                    <span className="flex items-center gap-1 bg-white border border-[#FF8A50] text-[#FF8A50] text-[10px] font-bold px-2.5 py-1 rounded-full">
                      🏪 Retirada no local
                    </span>
                  )}
                  {!store.deliveryConfig.ownDelivery && !store.deliveryConfig.pickup && (
                    <span className="text-[10px] text-gray-400 italic">Modalidade não informada</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {store.deliveryConfig.deliveryFee && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 min-w-[90px] font-semibold">💰 Taxa:</span>
                      <span className="text-gray-700 font-medium">{store.deliveryConfig.deliveryFee}</span>
                    </div>
                  )}
                  {store.deliveryConfig.estimatedTime && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 min-w-[90px] font-semibold">⏱️ Prazo:</span>
                      <span className="text-gray-700 font-medium">{store.deliveryConfig.estimatedTime}</span>
                    </div>
                  )}
                  {store.deliveryConfig.notes && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 min-w-[90px] font-semibold">📝 Obs:</span>
                      <span className="text-gray-600 italic">{store.deliveryConfig.notes}</span>
                    </div>
                  )}
                </div>

                {/* ── Área de Atendimento ───────────────────────────────── */}
                {store.deliveryConfig.serviceArea && store.deliveryConfig.serviceArea.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                      📍 Área de atendimento
                    </p>
                    {store.deliveryConfig.serviceArea.length >= LOCALIDADES.length ? (
                      <span className="inline-flex items-center gap-1 bg-[#e8f7f5] text-[#0B7A6E] text-[11px] font-bold px-3 py-1 rounded-full">
                        🗺️ Toda Saubara
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {store.deliveryConfig.serviceArea.map((slug) => {
                          const loc = LOCALIDADES.find((l) => l.value === slug);
                          if (!loc) return null;
                          return (
                            <span
                              key={slug}
                              className="inline-flex items-center gap-1 bg-[#e8f7f5] text-[#0B7A6E] text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            >
                              📍 {loc.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tarifas por localidade ────────────────────────────── */}
                {store.deliveryConfig.deliveryRates && Object.keys(store.deliveryConfig.deliveryRates).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                      💰 Tarifa por localidade
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {Object.entries(store.deliveryConfig.deliveryRates).map(([slug, fee]) => {
                        const loc = LOCALIDADES.find((l) => l.value === slug);
                        if (!loc) return null;
                        if (fee === -1) {
                          return (
                            <div key={slug} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-2.5 py-1.5">
                              <span className="text-[11px] text-gray-500 font-medium truncate">{loc.label}</span>
                              <span className="text-[11px] text-red-400 font-bold ml-1 shrink-0">Não atende</span>
                            </div>
                          );
                        }
                        return (
                          <div key={slug} className="flex items-center justify-between bg-white border border-[#d0ede9] rounded-xl px-2.5 py-1.5">
                            <span className="text-[11px] text-gray-600 font-medium truncate">{loc.label}</span>
                            <span className="text-[11px] text-[#0B7A6E] font-extrabold ml-1 shrink-0">
                              {fee === 0 ? "Grátis" : `R$ ${fee.toFixed(2).replace(".", ",")}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
                <span className="text-lg shrink-0">🚚</span>
                <p className="text-xs text-amber-700 font-medium">
                  Informações de entrega não informadas. Entre em contato para combinar.
                </p>
              </div>
            )}

            {/* ── WhatsApp CTA ────────────────────────────────────────────── */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-extrabold text-sm py-4 rounded-2xl transition-all shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              Falar com a Loja no WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ── Verified Trust Banner ──────────────────────────────────────────── */}
      {store.verified && (
        <div className="max-w-[900px] mx-auto px-4 mt-5">
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#E6F9F6] to-[#f0faf9] border border-[#b3e8e1] rounded-2xl px-4 py-3">
            <div className="bg-[#0F9D8A] text-white rounded-xl p-2 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#0B7A6E]">Loja Verificada pelo Saubara Meu Market</p>
              <p className="text-[11px] text-[#2d8b7e] leading-snug mt-0.5">
                Esta loja passou pelo processo de verificação da plataforma. Seus dados e identidade foram confirmados pela administração.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Produtos em Destaque ───────────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <div className="max-w-[900px] mx-auto px-4 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-[#FF8A50]" />
            <h2 className="text-base font-extrabold text-gray-900">Mais Vendidos</h2>
            <span className="ml-auto text-xs text-gray-500 font-medium bg-white border border-gray-200 px-2 py-0.5 rounded-full">
              {featuredProducts.length} itens
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <div key={product.id} className="snap-start shrink-0 w-[160px] sm:w-auto">
                <ProductCard
                  product={{ ...product, storeName: store.name, storeId: store.id, storeWhatsapp: store.whatsapp }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Catálogo Completo ──────────────────────────────────────────────── */}
      <div className="max-w-[900px] mx-auto px-4 mt-8">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-[#0F9D8A]" />
          <h2 className="text-base font-extrabold text-gray-900">Catálogo da Loja</h2>
          <span className="ml-auto text-xs text-gray-500 font-medium bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {totalProducts} produto{totalProducts !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search + Filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/30 focus:border-[#0F9D8A] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["todos", "destaque"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                  activeFilter === f
                    ? "bg-[#0F9D8A] text-white border-[#0F9D8A] shadow"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#0F9D8A]"
                }`}
              >
                {f === "todos" ? "Todos" : "⭐ Destaques"}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={{ ...product, storeName: store.name, storeId: store.id, storeWhatsapp: store.whatsapp }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Search className="w-10 h-10 stroke-1" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <button
              onClick={() => { setSearch(""); setActiveFilter("todos"); }}
              className="text-xs text-[#0F9D8A] font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Footer da Loja ─────────────────────────────────────────────────── */}
      <div className="max-w-[900px] mx-auto px-4 mt-10">
        <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white shadow-xl`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/30">
                <img src={store.imageUrl} alt={store.name} className="w-full h-full object-cover" />
              </div>
              {store.verified && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F9D8A]" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-base leading-tight">{store.name}</p>
                {store.verified && (
                  <span className="text-[9px] font-extrabold bg-white/20 text-white px-1.5 py-0.5 rounded-full border border-white/30">
                    ✓ VERIFICADA
                  </span>
                )}
              </div>
              {store.neighborhood && (
                <p className="text-white/70 text-xs">{store.neighborhood} · Saubara, BA</p>
              )}
              {store.joinedAt && (
                <p className="text-white/50 text-[10px]">Na plataforma desde {formatJoinDate(store.joinedAt)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-white/70" />
              <span className="text-white/90 text-xs leading-snug">{store.address}</span>
            </div>
            {store.hours && (
              <div className="flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-white/70" />
                <span className="text-white/90 text-xs leading-snug">{store.hours}</span>
              </div>
            )}
            <div className="flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2.5 sm:col-span-2">
              <Phone className="w-4 h-4 mt-0.5 shrink-0 text-white/70" />
              <span className="text-white/90 text-xs">
                WhatsApp: +{store.whatsapp.slice(0, 2)} ({store.whatsapp.slice(2, 4)}) {store.whatsapp.slice(4, 9)}-{store.whatsapp.slice(9)}
              </span>
            </div>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg text-sm"
          >
            <MessageCircle className="w-5 h-5" />
            Entrar em Contato pelo WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}


