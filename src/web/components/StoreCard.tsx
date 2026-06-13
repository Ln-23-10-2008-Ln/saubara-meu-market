import { Link } from "wouter";
import { Star, Clock, MessageCircle, Heart } from "lucide-react";
import type { Store } from "../lib/data";
import { categories } from "../lib/data";
import { formatRating, buildStoreWhatsAppLink } from "../lib/utils";
import { useFavorites } from "../lib/favorites";

const catBg: Record<string, string> = {
  mercados:     "bg-emerald-100 text-emerald-800",
  farmacias:    "bg-blue-100 text-blue-800",
  restaurantes: "bg-orange-100 text-orange-800",
  padarias:     "bg-yellow-100 text-yellow-900",
  hortifruti:   "bg-lime-100 text-lime-800",
  bebidas:      "bg-cyan-100 text-cyan-800",
  construcao:   "bg-stone-100 text-stone-700",
  informatica:  "bg-indigo-100 text-indigo-800",
  moda:         "bg-pink-100 text-pink-800",
  artesanato:   "bg-amber-100 text-amber-800",
  servicos:     "bg-purple-100 text-purple-800",
  cosmeticos:   "bg-rose-100 text-rose-800",
  celulares:    "bg-blue-100 text-blue-800",
  papelaria:    "bg-yellow-100 text-yellow-900",
  utilidades:   "bg-orange-100 text-orange-800",
};

export default function StoreCard({ store }: { store: Store }) {
  const cat = categories.find((c) => c.id === store.category);
  const whatsappLink = buildStoreWhatsAppLink(store.whatsapp, store.name);
  const { isStoreFav, toggleStore } = useFavorites();
  const fav = isStoreFav(store.id);

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex h-[96px] shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all border border-gray-100 group relative">
      {/* Thumb */}
      <Link to={`/store/${store.id}`} className="w-[96px] shrink-0 relative overflow-hidden cursor-pointer">
        <img
          src={store.imageUrl}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {store.featured && (
          <div className="absolute top-1.5 left-1.5">
            <span className="bg-[#FF8A50] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide shadow">
              ★ Top
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <Link to={`/store/${store.id}`} className="flex flex-col justify-center px-3.5 py-2.5 flex-1 min-w-0 gap-0.5 cursor-pointer">
        {cat && (
          <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-full w-fit ${catBg[store.category] ?? "bg-gray-100 text-gray-700"}`}>
            {cat.label}
          </span>
        )}
        <h3 className="font-extrabold text-gray-900 text-sm leading-tight line-clamp-1">{store.name}</h3>
        <p className="text-[11px] text-gray-500 line-clamp-1 font-medium">{store.description}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-0.5 text-[11px] text-amber-600 font-bold">
            <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />
            {formatRating(store.rating)}
          </span>
          {store.hours && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-500 font-medium">
              <Clock className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{store.hours}</span>
            </span>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="flex flex-col items-center justify-center gap-1.5 pr-3 shrink-0">
        {/* Heart */}
        <button
          onClick={(e) => { e.preventDefault(); toggleStore(store.id); }}
          title={fav ? "Remover dos favoritos" : "Favoritar loja"}
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-90"
          style={{
            background: fav ? "#fff0f5" : "#f5f5f5",
            border: fav ? "1.5px solid #f48fb1" : "1.5px solid #e0e0e0",
          }}
        >
          <Heart
            className="w-4 h-4 transition-all"
            style={{
              fill: fav ? "#e91e63" : "none",
              stroke: fav ? "#e91e63" : "#bbb",
            }}
          />
        </button>

        {/* WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Falar com a Loja pelo WhatsApp"
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-0.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl px-2.5 py-1.5 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-[8px] font-bold leading-none">Falar</span>
        </a>
      </div>
    </div>
  );
}
