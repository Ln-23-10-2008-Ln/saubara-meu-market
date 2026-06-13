import { useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, ShoppingCart, Check, Plus, Minus, Heart } from "lucide-react";
import type { Product } from "../lib/data";
import { formatPrice } from "../lib/utils";
import { useCart } from "../lib/cart";
import { useFavorites } from "../lib/favorites";
import OrderModal from "./OrderModal";

interface ProductCardProps {
  product: Product & { storeName?: string; storeId?: string; storeWhatsapp: string };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, updateQty, removeItem, items, isInCart } = useCart();
  const { isProductFav, toggleProduct } = useFavorites();
  const [orderOpen, setOrderOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [, navigate] = useLocation();

  const cartItem = items.find((i) => i.id === product.id);
  const inCart = isInCart(product.id);
  const fav = isProductFav(product.id);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      imageUrl: product.imageUrl,
      storeId: product.storeId ?? "",
      storeName: product.storeName ?? "",
      storeWhatsapp: product.storeWhatsapp,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleProduct({
      id: product.id,
      storeId: product.storeId ?? "",
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      storeName: product.storeName ?? "",
    });
  }

  const orderProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    unit: product.unit,
    imageUrl: product.imageUrl,
    storeName: product.storeName ?? "",
    storeWhatsapp: product.storeWhatsapp,
  };

  function handleCardClick() {
    if (product.storeId) {
      navigate(`/product/${product.storeId}/${product.id}`);
    }
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Cart badge */}
          {inCart && (
            <div className="absolute top-1.5 left-1.5 bg-[#0F9D8A] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow">
              No carrinho
            </div>
          )}
          {/* Heart button */}
          <button
            onClick={handleFav}
            title={fav ? "Remover dos favoritos" : "Favoritar"}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
            style={{
              background: fav ? "#fff0f5" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Heart
              className="w-3.5 h-3.5 transition-all"
              style={{
                fill: fav ? "#e91e63" : "none",
                stroke: fav ? "#e91e63" : "#999",
              }}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-1 flex-1">
          <h3 className="font-semibold text-gray-900 text-xs leading-snug line-clamp-2">{product.name}</h3>
          {product.storeName && (
            <p className="text-[10px] text-[#0F9D8A] font-medium line-clamp-1">{product.storeName}</p>
          )}

          <div className="mt-auto pt-2">
            <span className="text-sm font-extrabold text-[#0F9D8A] block mb-2">
              {formatPrice(product.price)}
              {product.unit && (
                <span className="text-[9px] font-normal text-gray-400">/{product.unit}</span>
              )}
            </span>

            {/* Cart quantity controls */}
            {inCart && cartItem ? (
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); cartItem.qty === 1 ? removeItem(product.id) : updateQty(product.id, cartItem.qty - 1); }}
                    className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-400 transition-colors"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-xs font-extrabold text-gray-800 w-4 text-center">{cartItem.qty}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateQty(product.id, cartItem.qty + 1); }}
                    className="w-6 h-6 rounded-full bg-[#0F9D8A] flex items-center justify-center hover:bg-[#0b8478] transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setOrderOpen(true); }}
                  className="flex items-center gap-0.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[9px] font-bold py-1.5 px-2 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                  Pedir
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => handleAdd(e)}
                  className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-2 rounded-lg transition-all active:scale-95 ${
                    justAdded
                      ? "bg-[#0F9D8A] text-white"
                      : "bg-[#0F9D8A]/10 hover:bg-[#0F9D8A]/20 text-[#0F9D8A]"
                  }`}
                >
                  {justAdded ? (
                    <><Check className="w-2.5 h-2.5" /> Adicionado!</>
                  ) : (
                    <><ShoppingCart className="w-2.5 h-2.5" /> Carrinho</>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setOrderOpen(true); }}
                  className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition-all shrink-0"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                  Pedir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <OrderModal
        product={orderOpen ? orderProduct : null}
        onClose={() => setOrderOpen(false)}
      />
    </>
  );
}
