import { useParams, useLocation } from "wouter";
import { smartBack } from "../lib/navigation";
import { LOCALIDADES } from "../lib/auth";
import {
  ArrowLeft,
  Clock,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Tag,
  Truck,
  Store,
  Star,
  BadgeCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  sales: number;
  active: boolean;
  photo?: string;
}

interface SellerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  storeName?: string;
  storeCategory?: string;
  storeWhatsapp?: string;
  storeBio?: string;
  storeHours?: string;
  storeLocalidade?: string;
  storeAddress?: string;
  storeLogo?: string;
  storeCover?: string;
  approvalStatus?: string;
  registeredAt?: string;
  deliveryConfig?: {
    ownDelivery?: boolean;
    pickup?: boolean;
    marketplaceDelivery?: boolean;
    deliveryFee?: string;
    estimatedTime?: string;
    notes?: string;
  };
  deliveryRates?: Record<string, number>;
  subscriptionStatus?: string;
}

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "construcao",  label: "Construção",       icon: "🏗️",  bg: "bg-stone-100 text-stone-700" },
  { value: "informatica", label: "Informática",      icon: "💻",  bg: "bg-indigo-100 text-indigo-700" },
  { value: "celulares",   label: "Celulares",        icon: "📱",  bg: "bg-blue-100 text-blue-700" },
  { value: "moda",        label: "Moda",             icon: "👗",  bg: "bg-pink-100 text-pink-700" },
  { value: "cosmeticos",  label: "Cosméticos",       icon: "💄",  bg: "bg-rose-100 text-rose-700" },
  { value: "papelaria",   label: "Papelaria",        icon: "📚",  bg: "bg-yellow-100 text-yellow-700" },
  { value: "utilidades",  label: "Utilidades",       icon: "🏠",  bg: "bg-orange-100 text-orange-700" },
  { value: "artesanato",  label: "Artesanato",       icon: "🎨",  bg: "bg-amber-100 text-amber-700" },
  { value: "servicos",    label: "Serviços",         icon: "🔧",  bg: "bg-purple-100 text-purple-700" },
  { value: "mercado",     label: "Mercado",          icon: "🛒",  bg: "bg-green-100 text-green-700" },
  { value: "farmacia",    label: "Farmácia",         icon: "💊",  bg: "bg-teal-100 text-teal-700" },
  { value: "alimentacao", label: "Alimentação",      icon: "🍽️", bg: "bg-lime-100 text-lime-700" },
];

const getCat = (cat: string) => CATEGORIES.find((c) => c.value === cat);
const catIcon  = (cat: string) => getCat(cat)?.icon  || "🏪";
const catLabel = (cat: string) => getCat(cat)?.label || cat;
const catBg    = (cat: string) => getCat(cat)?.bg    || "bg-gray-100 text-gray-700";

function formatJoinDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatPrice(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellerProfilePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const sellerId = params.id;

  // Load seller from localStorage
  let seller: SellerUser | null = null;
  try {
    const usersRaw = localStorage.getItem("saubara_registered_users");
    if (usersRaw) {
      const users: SellerUser[] = JSON.parse(usersRaw);
      seller = users.find((u) => u.id === sellerId) ?? null;
    }
  } catch { /* ignore */ }

  // Load seller products from localStorage
  let products: Product[] = [];
  try {
    const prodRaw = localStorage.getItem(`saubara_products_${sellerId}`);
    if (prodRaw) products = JSON.parse(prodRaw);
  } catch { /* ignore */ }

  const activeProducts = products.filter((p) => p.active && p.stock > 0);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!seller) {
    return (
      <div className="min-h-screen bg-[#F4F9F8] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl mb-2">🏪</div>
        <p className="text-gray-500 text-base font-medium">Loja não encontrada.</p>
        <button
          onClick={() => navigate("/")}
          className="text-[#0F9D8A] font-semibold cursor-pointer hover:underline"
        >
          ← Voltar ao início
        </button>
      </div>
    );
  }

  // ── Suspended ──────────────────────────────────────────────────────────────
  if (seller.subscriptionStatus === "suspended") {
    return (
      <div className="min-h-screen bg-[#F4F9F8] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl mb-2">🔒</div>
        <p className="text-lg font-bold text-gray-700">Loja temporariamente inativa</p>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Esta loja está temporariamente indisponível. Tente novamente mais tarde.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 bg-[#0F9D8A] text-white rounded-xl font-bold text-sm"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  const displayName  = seller.storeName || seller.name;
  const localidadeLabel = LOCALIDADES.find((l) => l.value === seller!.storeLocalidade)?.label;
  const waNumber = seller.storeWhatsapp;
  const isVerified = seller.approvalStatus === "approved";
  const whatsappLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Olá! Vi sua loja *${displayName}* no Saubara Meu Market e gostaria de fazer um pedido.`)}`
    : null;

  // Gradient based on category
  const catGradients: Record<string, string> = {
    construcao:  "from-stone-800 to-stone-600",
    informatica: "from-indigo-900 to-indigo-600",
    celulares:   "from-blue-900 to-blue-600",
    moda:        "from-pink-900 to-pink-600",
    cosmeticos:  "from-rose-900 to-rose-600",
    papelaria:   "from-yellow-800 to-yellow-600",
    utilidades:  "from-orange-800 to-orange-600",
    artesanato:  "from-amber-800 to-amber-600",
    servicos:    "from-purple-900 to-purple-600",
    mercado:     "from-green-900 to-green-600",
    farmacia:    "from-teal-900 to-teal-600",
    alimentacao: "from-lime-800 to-lime-600",
  };
  const gradient = catGradients[seller.storeCategory ?? ""] ?? "from-[#0B7A6E] to-[#0F9D8A]";

  return (
    <div className="min-h-screen bg-[#F0F6F5] pb-24">

      {/* ── Hero Cover ──────────────────────────────────────────────────────── */}
      <div className="relative h-52 sm:h-64 md:h-80 overflow-hidden">
        {seller.storeCover ? (
          <img
            src={seller.storeCover}
            alt={displayName}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}
        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-50`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => smartBack(navigate)}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 text-sm bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Featured badge */}
        {isVerified && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#FF8A50] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wide">
            <BadgeCheck className="w-3 h-3" />
            Verificada
          </div>
        )}

        {/* Store name at bottom of cover */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-16 pointer-events-none">
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Vitrine Digital</p>
          <h1 className="text-white text-2xl sm:text-3xl font-black leading-tight drop-shadow-lg line-clamp-1">
            {displayName}
          </h1>
        </div>
      </div>

      {/* ── Identity Card ────────────────────────────────────────────────────── */}
      <div className="max-w-[900px] mx-auto px-4">
        <div className="relative -mt-12 z-10 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* Top accent bar */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

          <div className="p-5 sm:p-6">
            {/* Logo + Info */}
            <div className="flex gap-4 items-start">
              {/* Logo */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center">
                  {seller.storeLogo ? (
                    <img
                      src={seller.storeLogo}
                      alt={`Logo ${displayName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">{catIcon(seller.storeCategory ?? "")}</span>
                  )}
                </div>
                {isVerified && (
                  <div
                    className="absolute -bottom-1 -right-1 bg-[#0F9D8A] text-white rounded-full p-1 shadow-lg border-2 border-white"
                    title="Loja Verificada"
                  >
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Category pill */}
                {seller.storeCategory && (
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${catBg(seller.storeCategory)} inline-block mb-1.5`}
                  >
                    {catIcon(seller.storeCategory)} {catLabel(seller.storeCategory)}
                  </span>
                )}

                {/* Name */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                    {displayName}
                  </h1>
                  {isVerified && (
                    <span className="flex items-center gap-1 bg-[#E6F9F6] text-[#0B7A6E] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#b3e8e1] whitespace-nowrap">
                      <ShieldCheck className="w-3 h-3" />
                      Loja Verificada
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i <= 4 ? "fill-amber-400 stroke-amber-400" : "stroke-gray-300 fill-gray-100"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Package className="w-3 h-3 text-[#0F9D8A]" />
                    {activeProducts.length} produto{activeProducts.length !== 1 ? "s" : ""}
                  </span>
                  {seller.registeredAt && (
                    <>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 font-medium">
                        Desde {formatJoinDate(seller.registeredAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio / Description */}
            {seller.storeBio && (
              <p className="text-sm text-gray-600 mt-4 leading-relaxed border-l-4 border-[#0F9D8A]/30 pl-3 bg-gray-50 py-2 rounded-r-xl">
                {seller.storeBio}
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="flex flex-col items-center justify-center bg-[#F0FBF9] rounded-2xl py-3 px-2 border border-[#D0EFE9]">
                <span className="text-xl font-black text-[#0F9D8A]">{activeProducts.length}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5 text-center leading-tight">Produtos</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-amber-50 rounded-2xl py-3 px-2 border border-amber-100">
                <span className="text-xl font-black text-amber-600">4.0</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5 text-center leading-tight">Avaliação</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-purple-50 rounded-2xl py-3 px-2 border border-purple-100">
                {isVerified ? (
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

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {(localidadeLabel || seller.storeAddress) && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <MapPin className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Localização</p>
                    {seller.storeAddress && (
                      <p className="text-xs font-semibold text-gray-700 leading-snug">{seller.storeAddress}</p>
                    )}
                    {localidadeLabel && (
                      <p className="text-[10px] text-[#0F9D8A] font-medium mt-0.5">{localidadeLabel} · Saubara, BA</p>
                    )}
                  </div>
                </div>
              )}
              {seller.storeHours && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Clock className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Horário</p>
                    <p className="text-xs font-semibold text-gray-700 leading-snug">{seller.storeHours}</p>
                  </div>
                </div>
              )}
              {seller.registeredAt && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Tag className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Na Plataforma desde</p>
                    <p className="text-xs font-semibold text-gray-700">{formatJoinDate(seller.registeredAt)}</p>
                  </div>
                </div>
              )}
              {seller.storeCategory && (
                <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Tag className="w-4 h-4 text-[#0F9D8A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Categoria</p>
                    <p className="text-xs font-semibold text-gray-700">
                      {catIcon(seller.storeCategory)} {catLabel(seller.storeCategory)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery info */}
            {(seller.deliveryConfig?.ownDelivery || seller.deliveryConfig?.pickup) ? (
              <div className="mt-4 bg-[#f0faf9] border border-[#c8ede9] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-[#0B7A6E]" />
                  <p className="text-xs font-extrabold text-[#0B7A6E] uppercase tracking-wide">Entrega & Retirada</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {seller.deliveryConfig?.ownDelivery && (
                    <span className="flex items-center gap-1 bg-white border border-[#0F9D8A] text-[#0F9D8A] text-[10px] font-bold px-2.5 py-1 rounded-full">
                      🛵 Entrega própria
                    </span>
                  )}
                  {seller.deliveryConfig?.pickup && (
                    <span className="flex items-center gap-1 bg-white border border-[#FF8A50] text-[#FF8A50] text-[10px] font-bold px-2.5 py-1 rounded-full">
                      🏪 Retirada no local
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {seller.deliveryConfig?.deliveryFee && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 min-w-[90px] font-semibold">💰 Taxa:</span>
                      <span className="text-gray-700 font-medium">{seller.deliveryConfig.deliveryFee}</span>
                    </div>
                  )}
                  {seller.deliveryConfig?.estimatedTime && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 min-w-[90px] font-semibold">⏱️ Prazo:</span>
                      <span className="text-gray-700 font-medium">{seller.deliveryConfig.estimatedTime}</span>
                    </div>
                  )}
                  {seller.deliveryConfig?.notes && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 min-w-[90px] font-semibold">📝 Obs:</span>
                      <span className="text-gray-600 italic">{seller.deliveryConfig.notes}</span>
                    </div>
                  )}
                </div>

                {/* Delivery rates per localidade */}
                {seller.deliveryRates && Object.keys(seller.deliveryRates).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                      💰 Tarifa por localidade
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {Object.entries(seller.deliveryRates).map(([slug, fee]) => {
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
                  Informações de entrega não configuradas. Entre em contato para combinar.
                </p>
              </div>
            )}

            {/* WhatsApp CTA */}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-extrabold text-sm py-4 rounded-2xl transition-all shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Falar com a Loja no WhatsApp
              </a>
            )}

            {!whatsappLink && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
                <span className="text-lg">⚠️</span>
                <p className="text-xs text-amber-700 font-medium">
                  Esta loja ainda não configurou um canal de contato via WhatsApp.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Verified Trust Banner ────────────────────────────────────────────── */}
      {isVerified && (
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

      {/* ── Produtos disponíveis ─────────────────────────────────────────────── */}
      {activeProducts.length > 0 && (
        <div className="max-w-[900px] mx-auto px-4 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[#0F9D8A]" />
            <h2 className="text-base font-extrabold text-gray-900">Produtos Disponíveis</h2>
            <span className="ml-auto text-xs text-gray-500 font-medium bg-white border border-gray-200 px-2 py-0.5 rounded-full">
              {activeProducts.length} ite{activeProducts.length !== 1 ? "ns" : "m"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                onClick={() => {
                  if (!waNumber) return;
                  const msg = `Olá! Vi o produto *${p.name}* (${formatPrice(p.price)}) na sua loja no Saubara Meu Market. Gostaria de encomendar!`;
                  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
                }}
              >
                {/* Product image */}
                <div className="w-full aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{catIcon(p.category)}</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-800 leading-snug line-clamp-2 mb-1.5">{p.name}</p>
                  <p className="text-sm font-black text-[#FF8A50]">{formatPrice(p.price)}</p>
                  {waNumber && (
                    <p className="mt-1.5 text-[10px] font-bold text-[#25A244] flex items-center gap-1">
                      💬 Pedir via WhatsApp
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No products placeholder ──────────────────────────────────────────── */}
      {activeProducts.length === 0 && (
        <div className="max-w-[900px] mx-auto px-4 mt-8">
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <span className="text-4xl block mb-3">📦</span>
            <p className="text-sm font-semibold text-gray-500">Esta loja ainda não cadastrou produtos.</p>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#0F9D8A] hover:underline"
              >
                <MessageCircle className="w-4 h-4" />
                Perguntar via WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[900px] mx-auto px-4 mt-8 text-center">
        <a href="/" className="text-xs text-gray-400 hover:text-[#0F9D8A] transition-colors">
          🛒 Saubara Meu Market · Feito em Saubara, BA
        </a>
      </div>
    </div>
  );
}
