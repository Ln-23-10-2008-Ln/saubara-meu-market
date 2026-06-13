import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "../lib/cart";
import { formatPrice } from "../lib/utils";
import { resolveStores } from "../lib/store-resolver";
import { useAuth } from "../lib/auth";
import { createOrder } from "../lib/orders";
import {
  ArrowLeft, ShoppingCart, Trash2, Plus, Minus,
  MessageCircle, Package, MapPin, User, CheckCircle, Store, Truck,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByStore(items: ReturnType<typeof useCart>["items"]) {
  const map = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.storeId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([storeId, storeItems]) => {
    const storeData = resolveStores().find((s) => s.id === storeId);
    return {
      storeId,
      storeName: storeItems[0].storeName,
      storeWhatsapp: storeItems[0].storeWhatsapp,
      deliveryConfig: storeData?.deliveryConfig,
      items: storeItems,
    };
  });
}

function buildCheckoutMessage(
  storeName: string,
  items: ReturnType<typeof useCart>["items"],
  subtotal: number,
  customerName: string,
  customerAddress: string,
  deliveryFee?: string,
  estimatedTime?: string,
): string {
  const itemLines = items
    .map((i) => `  • *${i.name}* — ${i.qty}x ${formatPrice(i.price)} = ${formatPrice(i.price * i.qty)}`)
    .join("\n");

  const deliveryLine = deliveryFee ? `🚚 *Entrega:* ${deliveryFee}` : `🚚 *Entrega:* A combinar`;
  const timeLine = estimatedTime ? `⏱️ *Prazo estimado:* ${estimatedTime}` : null;

  return [
    `Olá! Montei meu carrinho no *Saubara Meu Market* e gostaria de finalizar meu pedido:`,
    ``,
    `🏪 *Loja:* ${storeName}`,
    ``,
    `🛒 *Produtos:*`,
    itemLines,
    ``,
    `💰 *Subtotal:* ${formatPrice(subtotal)}`,
    deliveryLine,
    ...(timeLine ? [timeLine] : []),
    ``,
    `👤 *Meu nome:* ${customerName.trim() || "—"}`,
    `📍 *Endereço de entrega:* ${customerAddress.trim() || "—"}`,
    ``,
    `Aguardo confirmação de disponibilidade e prazo. Obrigado! 😊`,
  ].join("\n");
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { items, totalQty, updateQty, removeItem, clearCart, removeStore } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Checkout form state (per store)
  const [checkoutStoreId, setCheckoutStoreId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [sent, setSent] = useState(false);

  const groups = groupByStore(items);

  // ── Empty state ──
  if (totalQty === 0 && !sent) {
    return (
      <div className="min-h-screen bg-[#F4F9F8] flex flex-col">
        <CartHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-9 h-9 text-gray-300 stroke-1" />
          </div>
          <div>
            <p className="font-bold text-gray-700 text-lg">Seu carrinho está vazio</p>
            <p className="text-sm text-gray-400 mt-1">Adicione produtos das lojas de Saubara</p>
          </div>
          <Link to="/">
            <button className="mt-2 bg-[#0F9D8A] text-white font-bold py-3 px-8 rounded-2xl text-sm transition-all hover:bg-[#0b8478] active:scale-95">
              Explorar Lojas
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Sent state ──
  if (sent) {
    const store = groups.find((g) => g.storeId === checkoutStoreId);
    const storeItems = store?.items ?? [];
    const subtotal = storeItems.reduce((s, i) => s + i.price * i.qty, 0);
    return (
      <div className="min-h-screen bg-[#F4F9F8] flex flex-col">
        <CartHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center py-20">
          <div className="w-20 h-20 bg-[#25D366]/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#25D366]" />
          </div>
          <div>
            <p className="font-extrabold text-gray-900 text-xl">Pedido enviado!</p>
            <p className="text-sm text-gray-500 mt-1.5">
              Sua mensagem foi preparada e o WhatsApp foi aberto.<br />
              Aguarde a confirmação de <span className="font-semibold text-gray-700">{store?.storeName}</span>.
            </p>
          </div>
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 text-left shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Resumo do pedido</p>
            {storeItems.map((i) => (
              <div key={i.id} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                <span>{i.name} × {i.qty}</span>
                <span className="font-semibold">{formatPrice(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Subtotal dos produtos</span><span>{formatPrice(subtotal)}</span>
            </div>
            {store?.deliveryConfig?.deliveryFee && (
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>🚚 Entrega</span><span className="font-medium">{store.deliveryConfig.deliveryFee}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-[#0F9D8A] mt-1.5 pt-1.5 border-t border-gray-100">
              <span>Total dos produtos</span><span>{formatPrice(subtotal)}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">+ taxa de entrega a combinar</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <button
              onClick={() => { if (checkoutStoreId) removeStore(checkoutStoreId); navigate("/"); }}
              className="w-full bg-[#0F9D8A] text-white font-bold py-3 rounded-2xl text-sm transition-all hover:bg-[#0b8478] active:scale-95"
            >
              🛍️ Continuar comprando
            </button>
            <button
              onClick={() => { setSent(false); setCheckoutStoreId(null); }}
              className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-2xl text-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              Ver carrinho
            </button>
            {user && (
              <button
                onClick={() => navigate("/dashboard/client")}
                className="w-full bg-white border border-[#0F9D8A]/30 text-[#0F9D8A] font-bold py-3 rounded-2xl text-sm hover:bg-[#f0faf9] active:scale-95 transition-all"
              >
                📋 Ver meus pedidos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F9F8] pb-32">
      <CartHeader />

      <div className="max-w-[640px] mx-auto px-4 pt-5">

        {/* ── Title ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Meu Carrinho</h1>
            <p className="text-xs text-gray-400">{totalQty} {totalQty === 1 ? "item" : "itens"} de {groups.length} {groups.length === 1 ? "loja" : "lojas"}</p>
          </div>
          <button
            onClick={() => clearCart()}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>

        {/* ── Items grouped by store ── */}
        {groups.map((group) => {
          const subtotal = group.items.reduce((s, i) => s + i.price * i.qty, 0);
          const isCheckingOut = checkoutStoreId === group.storeId;

          return (
            <div key={group.storeId} className="mb-5">
              {/* Store header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-[#0F9D8A]/10 rounded-lg flex items-center justify-center shrink-0">
                  <Store className="w-3.5 h-3.5 text-[#0F9D8A]" />
                </div>
                <Link to={`/store/${group.storeId}`}>
                  <span className="text-sm font-extrabold text-gray-800 hover:text-[#0F9D8A] transition-colors cursor-pointer">
                    {group.storeName}
                  </span>
                </Link>
                <span className="ml-auto text-[10px] text-gray-400">{group.items.length} {group.items.length === 1 ? "produto" : "produtos"}</span>
              </div>

              {/* Product items */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
                {group.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 p-3 ${idx < group.items.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    {/* Image */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{item.name}</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-extrabold text-[#0F9D8A]">
                          {formatPrice(item.price * item.qty)}
                          {item.unit && (
                            <span className="text-[9px] font-normal text-gray-400 ml-0.5">× {item.qty} {item.unit}</span>
                          )}
                        </span>
                        {/* Qty controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-400 transition-colors"
                          >
                            {item.qty === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          </button>
                          <span className="w-5 text-center text-sm font-extrabold text-gray-800">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 rounded-full bg-[#0F9D8A] flex items-center justify-center hover:bg-[#0b8478] transition-colors"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="self-start p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Delivery info card */}
              {group.deliveryConfig ? (
                <div className="bg-[#f0faf9] border border-[#c8ede9] rounded-2xl p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Truck className="w-3.5 h-3.5 text-[#0F9D8A]" />
                    <p className="text-[10px] font-extrabold text-[#0B7A6E] uppercase tracking-wide">Entrega desta loja</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {group.deliveryConfig.ownDelivery && (
                      <span className="bg-white border border-[#0F9D8A] text-[#0F9D8A] text-[9px] font-bold px-2 py-0.5 rounded-full">🛵 Entrega própria</span>
                    )}
                    {group.deliveryConfig.pickup && (
                      <span className="bg-white border border-[#FF8A50] text-[#FF8A50] text-[9px] font-bold px-2 py-0.5 rounded-full">🏪 Retirada no local</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {group.deliveryConfig.deliveryFee && (
                      <p className="text-[10px] text-gray-600"><span className="font-semibold">💰 Taxa:</span> {group.deliveryConfig.deliveryFee}</p>
                    )}
                    {group.deliveryConfig.estimatedTime && (
                      <p className="text-[10px] text-gray-600"><span className="font-semibold">⏱️ Prazo:</span> {group.deliveryConfig.estimatedTime}</p>
                    )}
                    {group.deliveryConfig.notes && (
                      <p className="text-[10px] text-gray-500 italic">📝 {group.deliveryConfig.notes}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium">Taxa e prazo de entrega a combinar diretamente com a loja.</p>
                </div>
              )}

              {/* Subtotal card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Subtotal dos produtos</span>
                  <span className="font-semibold text-gray-700">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-800">Total dos produtos</span>
                  <span className="text-xl font-extrabold text-[#0F9D8A]">{formatPrice(subtotal)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-right">+ taxa de entrega conforme combinado com a loja</p>
              </div>

              {/* ── Checkout form (inline, per store) ── */}
              {isCheckingOut ? (
                <CheckoutForm
                  group={group}
                  subtotal={subtotal}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  customerAddress={customerAddress}
                  setCustomerAddress={setCustomerAddress}
                  onCancel={() => setCheckoutStoreId(null)}
                  onSend={() => {
                    const msg = buildCheckoutMessage(
                      group.storeName, group.items, subtotal, customerName, customerAddress,
                      group.deliveryConfig?.deliveryFee, group.deliveryConfig?.estimatedTime,
                    );
                    window.open(`https://wa.me/${group.storeWhatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
                    // Save order snapshot to history — only for authenticated users
                    if (user) {
                      try {
                        createOrder({
                          clientId: user.id,
                          clientName: customerName.trim() || user.name,
                          storeId: group.storeId,
                          storeName: group.storeName,
                          storeWhatsapp: group.storeWhatsapp,
                          items: group.items.map((i) => ({
                            productId: i.id,
                            productName: i.name,
                            quantity: i.qty,
                            price: i.price,
                            unit: i.unit,
                          })),
                          subtotal,
                          deliveryFee: 0,
                          total: subtotal,
                          localidade: customerAddress,
                          address: customerAddress,
                          notes: "",
                          status: "pending",
                        });
                      } catch (_) { /* silently skip if localStorage fails */ }
                    }
                    setCheckoutStoreId(group.storeId);
                    setSent(true);
                  }}
                />
              ) : (
                <button
                  onClick={() => setCheckoutStoreId(group.storeId)}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-extrabold py-4 rounded-2xl transition-all shadow-lg text-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  Finalizar pelo WhatsApp
                </button>
              )}
            </div>
          );
        })}

        {/* Multi-store notice */}
        {groups.length > 1 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
            <p className="text-xs text-amber-700 font-medium">
              Você tem itens de {groups.length} lojas diferentes. Finalize cada pedido separadamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CartHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#0F9D8A] shadow-md">
      <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/")}
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-white font-extrabold text-base ml-2">Carrinho</h1>
      </div>
    </header>
  );
}

interface CheckoutFormProps {
  group: { storeId: string; storeName: string; storeWhatsapp: string; deliveryConfig?: { ownDelivery?: boolean; pickup?: boolean; deliveryFee?: string; estimatedTime?: string; notes?: string }; items: ReturnType<typeof useCart>["items"] };
  subtotal: number;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerAddress: string;
  setCustomerAddress: (v: string) => void;
  onCancel: () => void;
  onSend: () => void;
}

function CheckoutForm({ group, subtotal, customerName, setCustomerName, customerAddress, setCustomerAddress, onCancel, onSend }: CheckoutFormProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});

  const preview = buildCheckoutMessage(
    group.storeName, group.items, subtotal,
    customerName || "Seu nome", customerAddress || "Seu endereço",
    group.deliveryConfig?.deliveryFee, group.deliveryConfig?.estimatedTime,
  );

  function handleSend() {
    const newErrors: { name?: string; address?: string } = {};
    if (!customerName.trim()) newErrors.name = "Informe seu nome para o vendedor.";
    if (!customerAddress.trim()) newErrors.address = "Informe o endereço de entrega.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSend();
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-[#0F9D8A]/10 rounded-lg flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-[#0F9D8A]" />
        </div>
        <div>
          <p className="text-xs font-extrabold text-gray-800">Seus dados para entrega</p>
          <p className="text-[10px] text-gray-400">Necessário para o vendedor confirmar seu pedido</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {/* Nome */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5">
            <User className="w-3.5 h-3.5 text-[#0F9D8A]" /> Seu nome <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => { setCustomerName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
            placeholder="Ex: João Silva"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.name
                ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                : "border-gray-200 focus:ring-[#0F9D8A]/30 focus:border-[#0F9D8A]"
            }`}
          />
          {errors.name && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">⚠ {errors.name}</p>}
        </div>

        {/* Endereço */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0F9D8A]" /> Endereço de entrega <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => { setCustomerAddress(e.target.value); setErrors((p) => ({ ...p, address: undefined })); }}
            placeholder="Rua, número, bairro — Saubara, BA"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              errors.address
                ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                : "border-gray-200 focus:ring-[#0F9D8A]/30 focus:border-[#0F9D8A]"
            }`}
          />
          {errors.address && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">⚠ {errors.address}</p>}
        </div>
      </div>

      {/* Prévia expansível */}
      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        className="w-full flex items-center justify-between text-[10px] font-bold text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3 hover:bg-gray-100 transition-colors"
      >
        <span>📋 Ver prévia da mensagem WhatsApp</span>
        <span className="text-gray-400">{showPreview ? "▲" : "▼"}</span>
      </button>

      {showPreview && (
        <div className="bg-[#DCF8C6] rounded-2xl p-3 mb-4 border border-[#25D366]/20">
          <pre className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{preview}</pre>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500 hover:border-gray-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSend}
          className="flex-[2] flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-extrabold py-3 rounded-2xl text-sm transition-all shadow-md"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar pelo WhatsApp
        </button>
      </div>
    </div>
  );
}
