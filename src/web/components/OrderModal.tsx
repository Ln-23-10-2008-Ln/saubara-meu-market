import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Minus, Plus, ShoppingBag, User, MapPin, ChevronRight, CheckCircle } from "lucide-react";
import { formatPrice } from "../lib/utils";

export interface OrderProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  unit?: string;
  imageUrl: string;
  storeName: string;
  storeWhatsapp: string;
}

interface OrderModalProps {
  product: OrderProduct | null;
  onClose: () => void;
}

function buildOrderMessage(
  product: OrderProduct,
  qty: number,
  name: string,
  address: string,
): string {
  const total = formatPrice(product.price * qty);
  const unitLabel = product.unit ? `/${product.unit}` : "";
  const lines = [
    `Olá! Encontrei seu produto no *Saubara Meu Market* e gostaria de solicitar:`,
    ``,
    `🛍️ *Produto:* ${product.name}`,
    `🔢 *Quantidade:* ${qty}${unitLabel}`,
    `💰 *Valor unitário:* ${formatPrice(product.price)}${unitLabel}`,
    `💵 *Total estimado:* ${total}`,
    ``,
    `👤 *Meu nome é:* ${name.trim() || "—"}`,
    `📍 *Endereço:* ${address.trim() || "—"}`,
    ``,
    `Aguardo confirmação de disponibilidade e prazo de entrega. Obrigado! 😊`,
  ];
  return lines.join("\n");
}

export default function OrderModal({ product, onClose }: OrderModalProps) {
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [step, setStep] = useState<"confirm" | "details" | "done">("confirm");
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQty(1);
      setName("");
      setAddress("");
      setStep("confirm");
    }
  }, [product]);

  // Focus name input when entering details step
  useEffect(() => {
    if (step === "details") {
      setTimeout(() => nameRef.current?.focus(), 300);
    }
  }, [step]);

  // Prevent body scroll while open
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  if (!product) return null;

  const total = product.price * qty;
  const unitLabel = product.unit ?? "un";

  function handleSend() {
    const msg = buildOrderMessage(product!, qty, name, address);
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${product!.storeWhatsapp}?text=${encoded}`, "_blank");
    setStep("done");
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[560px] mx-auto">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up">

          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#0F9D8A]" />
              <span className="font-bold text-sm text-gray-800">
                {step === "confirm" && "Confirmar Pedido"}
                {step === "details" && "Seus Dados"}
                {step === "done" && "Pedido Enviado!"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Step 1: Confirm product + qty ───────────────────── */}
          {step === "confirm" && (
            <div className="px-5 py-4">
              {/* Product row */}
              <div className="flex gap-3 p-3 bg-gray-50 rounded-2xl mb-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#0F9D8A] font-bold uppercase tracking-wide">{product.storeName}</p>
                  <h3 className="font-extrabold text-gray-900 text-sm leading-snug mt-0.5 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                  <p className="text-lg font-extrabold text-[#0F9D8A] mt-1">
                    {formatPrice(product.price)}
                    {product.unit && (
                      <span className="text-xs font-normal text-gray-400">/{product.unit}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-gray-700">Quantidade</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#0F9D8A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="w-8 text-center font-extrabold text-gray-900 text-lg">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-9 h-9 rounded-full border-2 border-[#0F9D8A] bg-[#0F9D8A] flex items-center justify-center hover:bg-[#0b8478] transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-[#0F9D8A]/8 rounded-2xl px-4 py-3 mb-5">
                <span className="text-sm font-semibold text-gray-600">Total estimado</span>
                <span className="text-xl font-extrabold text-[#0F9D8A]">
                  {formatPrice(total)}
                  {product.unit && qty > 1 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">({qty} {unitLabel})</span>
                  )}
                </span>
              </div>

              <button
                onClick={() => setStep("details")}
                className="w-full flex items-center justify-center gap-2 bg-[#0F9D8A] hover:bg-[#0b8478] active:scale-[0.98] text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg text-sm"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-2">
                Preço sujeito a confirmação pela loja
              </p>
            </div>
          )}

          {/* ── Step 2: Name + Address ───────────────────────────── */}
          {step === "details" && (
            <div className="px-5 py-4">
              {/* Mini product recap */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-4">
                <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 line-clamp-1">{product.name}</p>
                  <p className="text-[10px] text-gray-400">{qty} {unitLabel} · {formatPrice(total)}</p>
                </div>
                <button
                  onClick={() => setStep("confirm")}
                  className="text-[10px] text-[#0F9D8A] font-semibold shrink-0"
                >
                  Editar
                </button>
              </div>

              <div className="flex flex-col gap-3 mb-5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
                    <User className="w-3.5 h-3.5 text-[#0F9D8A]" />
                    Seu nome
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/30 focus:border-[#0F9D8A] transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0F9D8A]" />
                    Endereço de entrega
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro — Saubara, BA"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/30 focus:border-[#0F9D8A] transition-all"
                  />
                </div>
              </div>

              {/* Preview da mensagem */}
              <div className="bg-[#DCF8C6] rounded-2xl p-3 mb-4 border border-[#25D366]/20">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pré-visualização da mensagem</p>
                <pre className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {buildOrderMessage(product, qty, name || "Seu nome", address || "Seu endereço")}
                </pre>
              </div>

              <button
                onClick={handleSend}
                className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg text-sm"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar Pedido pelo WhatsApp
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-2">
                Você será redirecionado ao WhatsApp da loja
              </p>
            </div>
          )}

          {/* ── Step 3: Done ─────────────────────────────────────── */}
          {step === "done" && (
            <div className="px-5 py-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#25D366]" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Pedido enviado!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Sua mensagem foi preparada e o WhatsApp foi aberto.<br />
                  Aguarde a confirmação de <span className="font-semibold text-gray-700">{product.storeName}</span>.
                </p>
              </div>
              <div className="w-full bg-gray-50 rounded-2xl p-3 text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Resumo</p>
                <p className="text-xs text-gray-700 font-semibold">{product.name}</p>
                <p className="text-[11px] text-gray-500">{qty} {unitLabel} · {formatPrice(total)}</p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-[#0F9D8A] hover:bg-[#0b8478] text-white font-extrabold py-3.5 rounded-2xl transition-all text-sm"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
