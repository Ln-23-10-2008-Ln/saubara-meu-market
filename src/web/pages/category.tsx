import { useParams, useLocation } from "wouter";
import { smartBack } from "../lib/navigation";
import { ArrowLeft, Store as StoreIcon, Package, ShoppingCart } from "lucide-react";
import { categories } from "../lib/data";
import { useStores, getStoresByCategory } from "../lib/store-resolver";
import StoreCard from "../components/StoreCard";
import ProductCard from "../components/ProductCard";
import { useCart } from "../lib/cart";

const SOLID_BG: Record<string, string> = {
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

const GRADIENT_BG: Record<string, string> = {
  construcao:  "from-stone-700 to-stone-500",
  informatica: "from-indigo-700 to-indigo-500",
  celulares:   "from-blue-700 to-blue-500",
  moda:        "from-pink-700 to-pink-500",
  cosmeticos:  "from-rose-700 to-rose-500",
  papelaria:   "from-yellow-600 to-yellow-400",
  utilidades:  "from-orange-700 to-orange-500",
  artesanato:  "from-amber-700 to-amber-500",
  servicos:    "from-purple-700 to-purple-500",
};

const DESCRIPTIONS: Record<string, string> = {
  construcao:  "Materiais, ferramentas e tudo para sua obra em Saubara",
  informatica: "Equipamentos, acessórios e serviços de informática",
  celulares:   "Smartphones, capas, películas e assistência técnica",
  moda:        "Roupas, calçados e acessórios para toda a família",
  cosmeticos:  "Beleza, cuidado pessoal e produtos de estética",
  papelaria:   "Materiais escolares, escritório e presentes",
  utilidades:  "Itens para o lar, cozinha e utilidades domésticas",
  artesanato:  "Peças artesanais, presentes e produtos locais únicos",
  servicos:    "Serviços profissionais e prestadores locais",
};

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { totalQty } = useCart();

  const { activeStores } = useStores();
  const category = categories.find((c) => c.id === id);
  const categoryStores = getStoresByCategory(id ?? "", activeStores);

  // Flatten all products from stores in this category, enriched with store info
  const categoryProducts = categoryStores.flatMap((store) =>
    store.products.map((product) => ({
      ...product,
      storeName: store.name,
      storeId: store.id,
      storeWhatsapp: store.whatsapp,
    }))
  );

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4">
        <span className="text-5xl">🔍</span>
        <h1 className="text-xl font-bold text-gray-800">Categoria não encontrada</h1>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#0F9D8A] font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </button>
      </div>
    );
  }

  const gradient = GRADIENT_BG[id ?? ""] ?? "from-gray-700 to-gray-500";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div className={`relative bg-gradient-to-br ${gradient} pt-safe`}>
        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => smartBack(navigate)}
            className="flex items-center gap-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {/* Cart button top-right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => navigate("/cart")}
            className="relative flex items-center gap-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {totalQty > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FF8A50] text-white text-[9px] font-extrabold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                {totalQty > 99 ? "99+" : totalQty}
              </span>
            )}
          </button>
        </div>

        {/* Category info */}
        <div className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl mb-4"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.3)" }}
          >
            {category.icon}
          </div>
          <h1 className="text-white text-2xl font-extrabold mb-1" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            {category.label}
          </h1>
          <p className="text-white/80 text-sm font-medium max-w-xs">
            {DESCRIPTIONS[id ?? ""] ?? "Produtos e lojas desta categoria em Saubara"}
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex justify-center gap-6 pb-5">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5">
            <StoreIcon className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">
              {categoryStores.length} {categoryStores.length === 1 ? "loja" : "lojas"}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2.5">
            <Package className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">
              {categoryProducts.length} {categoryProducts.length === 1 ? "produto" : "produtos"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* Empty state */}
        {categoryStores.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <span className="text-5xl">{category.icon}</span>
            <h2 className="text-gray-700 font-bold text-lg">Nenhuma loja nesta categoria ainda</h2>
            <p className="text-gray-500 text-sm">Em breve novos comerciantes locais serão cadastrados.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 text-[#0F9D8A] font-semibold text-sm underline underline-offset-2"
            >
              Ver todas as categorias
            </button>
          </div>
        )}

        {/* Stores section */}
        {categoryStores.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <StoreIcon className="w-4 h-4 text-[#0F9D8A]" />
              <h2 className="text-gray-900 font-extrabold text-base">
                Lojas de {category.label}
              </h2>
              <span className="ml-auto text-xs font-bold text-white bg-[#0F9D8A] rounded-full px-2 py-0.5">
                {categoryStores.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </section>
        )}

        {/* Products section */}
        {categoryProducts.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-[#FF8A50]" />
              <h2 className="text-gray-900 font-extrabold text-base">
                Produtos disponíveis
              </h2>
              <span className="ml-auto text-xs font-bold text-white bg-[#FF8A50] rounded-full px-2 py-0.5">
                {categoryProducts.length}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoryProducts.map((product) => (
                <ProductCard key={`${product.storeId}-${product.id}`} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Footer spacing */}
        <div className="h-6" />
      </div>
    </div>
  );
}
