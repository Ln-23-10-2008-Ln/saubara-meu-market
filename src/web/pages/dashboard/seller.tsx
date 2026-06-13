import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, LOCALIDADES, Localidade, UserAddress, DeliveryConfig, computeSubscriptionStatus, subscriptionDaysRemaining } from "../../lib/auth";
import { notifyStoresUpdated } from "../../lib/store-resolver";
import { useOrders, ORDER_STATUS_LABEL, type OrderStatus } from "../../lib/orders";
import { uploadImageWithFallback, type UploadType } from "../../lib/upload";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "painel" | "produtos" | "pedidos" | "config";

const CATEGORIES = [
  { value: "construcao", label: "Construção", icon: "🏗️" },
  { value: "informatica", label: "Informática", icon: "💻" },
  { value: "celulares", label: "Celulares", icon: "📱" },
  { value: "moda", label: "Moda", icon: "👗" },
  { value: "cosmeticos", label: "Cosméticos", icon: "💄" },
  { value: "papelaria", label: "Papelaria", icon: "📚" },
  { value: "utilidades", label: "Utilidades", icon: "🏠" },
  { value: "artesanato", label: "Artesanato", icon: "🎨" },
  { value: "servicos", label: "Serviços", icon: "🔧" },
];

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  sales: number;
  active: boolean;
  photo?: string; // base64 or URL
}

// ─── Display order type (maps from real Order) ────────────────────────────────

interface DisplayOrder {
  id: string;
  customer: string;
  customerPhone: string;
  localidade: string;
  product: string;
  qty: number;
  status: "Aguardando" | "Confirmado" | "Preparando" | "Enviado" | "Entregue" | "Cancelado";
  date: string;
  total: number;
  rawStatus: OrderStatus;
}

// ─── No seed products — new stores start with empty catalog ──────────────────

// ─── Map real OrderStatus → display label ────────────────────────────────────

function toDisplayStatus(s: OrderStatus): DisplayOrder["status"] {
  switch (s) {
    case "pending":      return "Aguardando";
    case "confirmed":    return "Confirmado";
    case "preparing":    return "Preparando";
    case "out_delivery": return "Enviado";
    case "delivered":    return "Entregue";
    case "cancelled":    return "Cancelado";
    default:             return "Aguardando";
  }
}

function toRealStatus(s: DisplayOrder["status"]): OrderStatus {
  switch (s) {
    case "Aguardando": return "pending";
    case "Confirmado": return "confirmed";
    case "Preparando": return "preparing";
    case "Enviado":    return "out_delivery";
    case "Entregue":   return "delivered";
    case "Cancelado":  return "cancelled";
  }
}

const STATUS_META: Record<DisplayOrder["status"], { bg: string; text: string; next?: DisplayOrder["status"] }> = {
  "Aguardando":  { bg: "#fff8e1", text: "#f57f17", next: "Confirmado" },
  "Confirmado":  { bg: "#e8f5e9", text: "#2e7d32", next: "Preparando" },
  "Preparando":  { bg: "#fff3e0", text: "#e65100", next: "Enviado" },
  "Enviado":     { bg: "#e3f2fd", text: "#1565c0", next: "Entregue" },
  "Entregue":    { bg: "#f3e5f5", text: "#6a1b9a" },
  "Cancelado":   { bg: "#ffebee", text: "#c62828" },
};

// ─── Empty product form ───────────────────────────────────────────────────────

const emptyProduct = (): Omit<Product, "id" | "sales"> => ({
  name: "", category: "", description: "", price: 0, stock: 0, active: true, photo: undefined,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellerDashboard() {
  const [, navigate] = useLocation();
  const { user, logout, updateUser } = useAuth();

  // Navigation
  const [tab, setTab] = useState<Tab>("painel");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Products state — persisted per seller
  const storageKey = `saubara_products_${user?.id || "guest"}`;
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [productModal, setProductModal] = useState<{ open: boolean; mode: "add" | "edit"; product: Omit<Product, "id" | "sales"> & { id?: number; sales?: number } }>({
    open: false, mode: "add", product: emptyProduct(),
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Upload state ──────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Persist products to localStorage on every change — also notify store resolver
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(products));
      notifyStoresUpdated();
    } catch { /* quota */ }
  }, [products, storageKey]);

  // Orders state — from real order system
  const { getByStore, updateStatus } = useOrders();
  const storeId = `merchant-${user?.id || "guest"}`;
  const rawOrders = getByStore(storeId);
  const orders: DisplayOrder[] = rawOrders.map(o => ({
    id: o.id,
    customer: o.clientName || "Cliente",
    customerPhone: o.storeWhatsapp || "",
    localidade: o.localidade,
    product: o.items.map(i => `${i.productName} ×${i.quantity}`).join(", "),
    qty: o.items.reduce((s, i) => s + i.quantity, 0),
    status: toDisplayStatus(o.status),
    date: new Date(o.createdAt).toLocaleDateString("pt-BR"),
    total: o.total,
    rawStatus: o.status,
  }));
  const [orderFilter, setOrderFilter] = useState<DisplayOrder["status"] | "Todos">("Todos");

  // Config state
  const [configEditMode, setConfigEditMode] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    storeName: user?.storeName || "",
    storeCategory: (user?.storeCategory || "") as string,
    storeWhatsapp: user?.storeWhatsapp || "",
    storeBio: user?.storeBio || "",
    storeHours: user?.storeHours || "",
    storeLocalidade: (user?.storeLocalidade || "") as Localidade | "",
    storeAddress: user?.storeAddress || "",
    storeLogo: user?.storeLogo || "",
    storeCover: user?.storeCover || "",
    localidade: (user?.address?.localidade || "") as Localidade | "",
    rua: user?.address?.rua || "",
    numero: user?.address?.numero || "",
    complemento: user?.address?.complemento || "",
    referencia: user?.address?.referencia || "",
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [configSaved, setConfigSaved] = useState(false);
  // Delivery rates per localidade (R$: 0=grátis, -1=não atende)
  const [deliveryRates, setDeliveryRates] = useState<Partial<Record<Localidade, number>>>(
    user?.deliveryRates ?? {}
  );
  const [deliveryRatesSaved, setDeliveryRatesSaved] = useState(false);

  // Delivery config state
  const [deliveryEditMode, setDeliveryEditMode] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryConfig>({
    ownDelivery: user?.deliveryConfig?.ownDelivery ?? false,
    pickup: user?.deliveryConfig?.pickup ?? false,
    marketplaceDelivery: false,
    deliveryFee: user?.deliveryConfig?.deliveryFee || "",
    estimatedTime: user?.deliveryConfig?.estimatedTime || "",
    notes: user?.deliveryConfig?.notes || "",
  });
  const [deliverySaved, setDeliverySaved] = useState(false);

  if (!user) { navigate("/auth/login"); return null; }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const totalRevenue = orders.filter(o => o.status === "Entregue").reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === "Aguardando").length;
  const filteredOrders = orderFilter === "Todos" ? orders : orders.filter(o => o.status === orderFilter);

  // ── Product actions ───────────────────────────────────────────────────────
  const openAddProduct = () => setProductModal({ open: true, mode: "add", product: emptyProduct() });

  const openEditProduct = (p: Product) => setProductModal({
    open: true, mode: "edit",
    product: { id: p.id, sales: p.sales, name: p.name, category: p.category, description: p.description, price: p.price, stock: p.stock, active: p.active, photo: p.photo },
  });

  const saveProduct = () => {
    const p = productModal.product;
    if (!p.name.trim() || !p.category || p.price <= 0) return;
    if (productModal.mode === "add") {
      setProducts(prev => [...prev, { ...p, id: Date.now(), sales: 0 }]);
    } else {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, ...p, id: x.id, sales: x.sales } : x));
    }
    setProductModal(m => ({ ...m, open: false }));
  };

  const deleteProduct = (id: number) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
  };

  const toggleProduct = (id: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadError(null);
    try {
      const { url } = await uploadImageWithFallback(file, "product");
      setProductModal(m => ({ ...m, product: { ...m.product, photo: url } }));
    } catch (err: any) {
      setUploadError(err?.message || "Erro ao fazer upload da foto.");
    } finally {
      setUploadingPhoto(false);
      // Limpar input para permitir re-seleção do mesmo arquivo
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // ── Order actions — persist via real order system ─────────────────────────
  const advanceOrder = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const next = STATUS_META[order.status]?.next;
    if (next) updateStatus(id, toRealStatus(next));
  };

  const cancelOrder = (id: string) => {
    updateStatus(id, "cancelled");
  };

  // ── Config actions ────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setUploadError(null);
    try {
      const { url } = await uploadImageWithFallback(file, "store-logo");
      setConfigForm(f => ({ ...f, storeLogo: url }));
    } catch (err: any) {
      setUploadError(err?.message || "Erro ao fazer upload do logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setUploadError(null);
    try {
      const { url } = await uploadImageWithFallback(file, "store-cover");
      setConfigForm(f => ({ ...f, storeCover: url }));
    } catch (err: any) {
      setUploadError(err?.message || "Erro ao fazer upload da capa.");
    } finally {
      setUploadingCover(false);
    }
  };

  const saveConfig = () => {
    const address: UserAddress | undefined = configForm.localidade
      ? { localidade: configForm.localidade as Localidade, rua: configForm.rua || undefined, numero: configForm.numero || undefined, complemento: configForm.complemento || undefined, referencia: configForm.referencia || undefined }
      : undefined;
    updateUser({
      name: configForm.name,
      phone: configForm.phone,
      storeName: configForm.storeName,
      storeCategory: configForm.storeCategory || undefined,
      storeWhatsapp: configForm.storeWhatsapp || undefined,
      storeBio: configForm.storeBio || undefined,
      storeHours: configForm.storeHours || undefined,
      storeLocalidade: (configForm.storeLocalidade as Localidade) || undefined,
      storeAddress: configForm.storeAddress || undefined,
      storeLogo: configForm.storeLogo || undefined,
      storeCover: configForm.storeCover || undefined,
      address,
    });
    setConfigEditMode(false);
    setConfigSaved(true);
    notifyStoresUpdated();
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const saveDeliveryRates = () => {
    updateUser({ deliveryRates });
    notifyStoresUpdated();
    setDeliveryRatesSaved(true);
    setTimeout(() => setDeliveryRatesSaved(false), 2500);
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const saveDelivery = () => {
    updateUser({ deliveryConfig: { ...deliveryForm, marketplaceDelivery: false } });
    notifyStoresUpdated();
    setDeliveryEditMode(false);
    setDeliverySaved(true);
    setTimeout(() => setDeliverySaved(false), 2500);
  };

  // ─── Shared styles ────────────────────────────────────────────────────────
  const inputSt: React.CSSProperties = { width: "100%", padding: "10px 13px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const catIcon = (val: string) => CATEGORIES.find(c => c.value === val)?.icon || "🏷️";
  const catLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

  const NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
    { key: "painel", label: "Minha Loja", icon: "🏪" },
    { key: "produtos", label: "Produtos", icon: "🏷️" },
    { key: "pedidos", label: "Pedidos", icon: "📦" },
    { key: "config", label: "Configurações", icon: "⚙️" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", minHeight: "100vh", background: "#f4f5f7", display: "flex", flexDirection: "column" }}>

      {/* ── Top Header ── */}
      <header style={{ background: "#0B7A6E", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: "60px", gap: "12px" }}>
          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "white", fontSize: "20px", display: "flex", alignItems: "center", padding: "4px" }}>
            ☰
          </button>

          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "30px", height: "30px", background: "white", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "16px" }}>🛍️</span>
            </div>
            <span style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>Saubara</span>
          </button>

          <div style={{ flex: 1 }} />

          {/* Store badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {pendingOrders > 0 && (
              <div style={{ background: "#FF8A50", color: "white", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>
                {pendingOrders} pendente{pendingOrders > 1 ? "s" : ""}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "34px", height: "34px", background: "#FF8A50", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "white" }}>
                {(user.storeName || user.name).charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.2, display: "flex", flexDirection: "column" }}>
                <span style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>{user.storeName || user.name}</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px" }}>Comerciante</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "24px 20px", gap: "24px", boxSizing: "border-box" }}>

        {/* ── Sidebar overlay (mobile) ── */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 150 }} />
        )}

        {/* ── Sidebar ── */}
        <aside style={{
          width: "220px", flexShrink: 0,
          position: sidebarOpen ? "fixed" : "sticky",
          top: sidebarOpen ? 0 : "84px",
          left: sidebarOpen ? 0 : "auto",
          height: sidebarOpen ? "100vh" : "fit-content",
          background: "white",
          borderRadius: sidebarOpen ? "0 16px 16px 0" : "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          zIndex: sidebarOpen ? 160 : 10,
          padding: "20px 0",
          overflowY: "auto",
          transition: "all 0.2s",
        }}>
          {/* Store avatar block */}
          <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #f0f0f0", marginBottom: "8px" }}>
            <div style={{ width: "52px", height: "52px", background: "linear-gradient(135deg, #FF8A50, #e06030)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 700, color: "white", marginBottom: "10px" }}>
              {(user.storeName || user.name).charAt(0).toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a1a", lineHeight: 1.2 }}>{user.storeName || user.name}</div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{catLabel(user.storeCategory || "")}</div>
            {(() => {
              // Show approval status first if not approved
              if (user.approvalStatus === "pending") return (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                  <span style={{ width: "7px", height: "7px", background: "#eab308", borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ fontSize: "11px", color: "#92400e" }}>Aguardando aprovação</span>
                </div>
              );
              if (user.approvalStatus === "rejected") return (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                  <span style={{ width: "7px", height: "7px", background: "#e53935", borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ fontSize: "11px", color: "#c62828" }}>Cadastro rejeitado</span>
                </div>
              );
              if (user.approvalStatus === "suspended") return (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                  <span style={{ width: "7px", height: "7px", background: "#9ca3af", borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Conta suspensa</span>
                </div>
              );
              // Approved — show subscription status
              const sub = user.subscription;
              if (!sub) return (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                  <span style={{ width: "7px", height: "7px", background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ fontSize: "11px", color: "#555" }}>Loja ativa</span>
                </div>
              );
              const status = computeSubscriptionStatus(sub);
              const days = subscriptionDaysRemaining(sub);
              const dot = status === "trial" || status === "active" ? "#22c55e"
                : status === "expired" ? "#e53935" : "#999";
              const label = status === "trial" ? `Gratuito · ${days}d`
                : status === "active" ? "Ativa"
                : status === "expired" ? "Vencida"
                : "Suspensa";
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}>
                  <span style={{ width: "7px", height: "7px", background: dot, borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ fontSize: "11px", color: "#555" }}>{label}</span>
                </div>
              );
            })()}
          </div>

          {NAV_ITEMS.map((item) => (
            <button key={item.key}
              onClick={() => { setTab(item.key); setSidebarOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 16px", border: "none", cursor: "pointer",
                background: tab === item.key ? "#fff8f5" : "transparent",
                color: tab === item.key ? "#FF8A50" : "#555",
                fontWeight: tab === item.key ? 700 : 500,
                fontSize: "14px", textAlign: "left",
                borderLeft: tab === item.key ? "3px solid #FF8A50" : "3px solid transparent",
                transition: "all 0.15s",
              }}>
              <span style={{ fontSize: "17px" }}>{item.icon}</span>
              {item.label}
              {item.key === "pedidos" && pendingOrders > 0 && (
                <span style={{ marginLeft: "auto", background: "#FF8A50", color: "white", fontSize: "10px", fontWeight: 700, borderRadius: "20px", padding: "2px 7px" }}>
                  {pendingOrders}
                </span>
              )}
            </button>
          ))}

          <div style={{ margin: "12px 16px 0", borderTop: "1px solid #f0f0f0", paddingTop: "12px" }}>
            <button onClick={() => navigate("/")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", border: "none", background: "none", cursor: "pointer", color: "#888", fontSize: "13px" }}>
              ← Marketplace
            </button>
            <button onClick={handleLogout}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", border: "none", background: "none", cursor: "pointer", color: "#e53935", fontSize: "13px", fontWeight: 600 }}>
              🚪 Sair
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ── Approval Status Banner ── */}
          {user.approvalStatus === "pending" && (
            <div style={{ borderRadius: "12px", padding: "14px 18px", marginBottom: "18px", background: "#fefce8", border: "1.5px solid #eab308", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "20px" }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#92400e" }}>Sua loja está aguardando aprovação do administrador</div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                  {user.approvalNote
                    ? `Orientação: ${user.approvalNote}`
                    : "Em breve você receberá uma resposta. Enquanto isso, você pode configurar sua loja."}
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#eab308", color: "white", whiteSpace: "nowrap" }}>PENDENTE</span>
            </div>
          )}

          {user.approvalStatus === "rejected" && (
            <div style={{ borderRadius: "12px", padding: "14px 18px", marginBottom: "18px", background: "#fff3f3", border: "1.5px solid #e53935", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "20px" }}>❌</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#c62828" }}>Cadastro rejeitado</div>
                {user.approvalNote && (
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px", background: "#ffebee", borderRadius: "8px", padding: "8px 12px", lineHeight: 1.5 }}>
                    💬 {user.approvalNote}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>
                  Entre em contato com o administrador para regularizar seu cadastro.
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#e53935", color: "white", whiteSpace: "nowrap" }}>REJEITADO</span>
            </div>
          )}

          {/* ── Subscription Banner (only when approved) ── */}
          {user.approvalStatus === "approved" && ((): React.ReactNode => {
            const sub = user.subscription;
            if (!sub) return null;
            const status = computeSubscriptionStatus(sub);
            const days = subscriptionDaysRemaining(sub);

            if (status === "trial") {
              const urgent = days <= 7;
              return (
                <div style={{
                  borderRadius: "12px", padding: "14px 18px", marginBottom: "18px",
                  background: urgent ? "#fff8f0" : "#f0faf9",
                  border: `1.5px solid ${urgent ? "#FF8A50" : "#0F9D8A"}`,
                  display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: "20px" }}>{urgent ? "⚠️" : "🎁"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: urgent ? "#c05a20" : "#0B7A6E" }}>
                      {urgent ? `Período gratuito expira em ${days} dia${days !== 1 ? "s" : ""}!` : `Período gratuito — ${days} dias restantes`}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                      {urgent
                        ? "Sua loja ficará suspensa após o vencimento. Em breve você poderá renovar sua assinatura."
                        : "Aproveite os 30 dias gratuitos para configurar sua loja. Renovação em breve disponível."}
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: urgent ? "#FF8A50" : "#0F9D8A", color: "white", whiteSpace: "nowrap" }}>
                    PERÍODO GRATUITO
                  </span>
                </div>
              );
            }

            if (status === "active") {
              const nearExpiry = days <= 7;
              if (!nearExpiry) return null; // don't show if plenty of time
              return (
                <div style={{ borderRadius: "12px", padding: "14px 18px", marginBottom: "18px", background: "#fff8f0", border: "1.5px solid #FF8A50", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#c05a20" }}>Assinatura vence em {days} dia{days !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>Renove para manter sua loja visível no marketplace.</div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#FF8A50", color: "white" }}>ATIVA</span>
                </div>
              );
            }

            if (status === "expired") {
              return (
                <div style={{ borderRadius: "12px", padding: "14px 18px", marginBottom: "18px", background: "#fff3f3", border: "1.5px solid #e53935", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "20px" }}>🔴</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#c62828" }}>Assinatura vencida — Loja suspensa</div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                      Sua loja não está visível para os clientes. Entre em contato com o suporte para renovar.
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#e53935", color: "white" }}>VENCIDA</span>
                </div>
              );
            }

            if (status === "suspended") {
              return (
                <div style={{ borderRadius: "12px", padding: "14px 18px", marginBottom: "18px", background: "#fafafa", border: "1.5px solid #999", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "20px" }}>⛔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#555" }}>Conta suspensa</div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                      Sua loja está suspensa e não aparece no marketplace. Entre em contato com o suporte.
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#999", color: "white" }}>SUSPENSA</span>
                </div>
              );
            }

            return null;
          })()}

          {/* ══════════════ PAINEL ══════════════ */}
          {tab === "painel" && (
            <div>
              {/* Store banner */}
              <div style={{ background: "linear-gradient(135deg, #FF8A50 0%, #c05a20 100%)", borderRadius: "18px", padding: "24px 28px", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: "-20px", top: "-20px", width: "140px", height: "140px", background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
                <div style={{ position: "absolute", right: "40px", bottom: "-40px", width: "100px", height: "100px", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", margin: "0 0 4px" }}>Bem-vindo ao painel</p>
                <h2 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>{user.storeName || user.name} 🏪</h2>
                <span style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: "12px", padding: "3px 10px", borderRadius: "20px" }}>
                  {catIcon(user.storeCategory || "")} {catLabel(user.storeCategory || "Comerciante")}
                </span>
                {user.address && (
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", margin: "10px 0 0" }}>
                    📍 {LOCALIDADES.find(l => l.value === user.address?.localidade)?.label || user.address.localidade}
                    {user.address.rua ? ` · ${user.address.rua}` : ""}
                  </p>
                )}
              </div>

              {/* KPI grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                {[
                  { label: "Produtos cadastrados", value: String(totalProducts), icon: "🏷️", color: "#1E88E5", bg: "#e3f2fd" },
                  { label: "Produtos ativos", value: String(activeProducts), icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
                  { label: "Pedidos recebidos", value: String(orders.length), icon: "📦", color: "#6a1b9a", bg: "#f3e5f5" },
                  { label: "Pendentes", value: String(pendingOrders), icon: "⏳", color: "#FF8A50", bg: "#fff8f5" },
                  { label: "Receita (entregues)", value: `R$ ${totalRevenue.toFixed(2).replace(".", ",")}`, icon: "💰", color: "#0F9D8A", bg: "#f0faf9" },
                ].map((k) => (
                  <div key={k.label} style={{ background: "white", borderRadius: "14px", padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: "38px", height: "38px", background: k.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "10px" }}>
                      {k.icon}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "20px", color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "2px", lineHeight: 1.3 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={{ background: "white", borderRadius: "14px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 14px" }}>Ações rápidas</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={() => { setTab("produtos"); openAddProduct(); }}
                    style={{ background: "#FF8A50", color: "white", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                    + Novo produto
                  </button>
                  <button onClick={() => setTab("pedidos")}
                    style={{ background: "#f0faf9", color: "#0F9D8A", border: "1.5px solid #0F9D8A", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                    Ver pedidos {pendingOrders > 0 && `(${pendingOrders})`}
                  </button>
                  <a href={`https://wa.me/55${user.phone}`} target="_blank" rel="noopener noreferrer"
                    style={{ background: "#25D366", color: "white", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, fontSize: "13px", textDecoration: "none" }}>
                    💬 WhatsApp
                  </a>
                </div>
              </div>

              {/* Recent orders preview */}
              <div style={{ background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Últimos pedidos</h3>
                  <button onClick={() => setTab("pedidos")} style={{ background: "none", border: "none", color: "#FF8A50", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>Ver todos →</button>
                </div>
                {orders.slice(0, 3).map((o) => {
                  const sm = STATUS_META[o.status];
                  return (
                    <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a" }}>{o.customer}</div>
                        <div style={{ fontSize: "11px", color: "#888" }}>{o.product} · {o.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ background: sm.bg, color: sm.text, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", marginBottom: "2px" }}>{o.status}</div>
                        <div style={{ fontWeight: 700, color: "#0F9D8A", fontSize: "13px" }}>R$ {o.total.toFixed(2).replace(".", ",")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════ PRODUTOS ══════════════ */}
          {tab === "produtos" && (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Produtos</h2>
                  <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{totalProducts} cadastrados · {activeProducts} ativos</p>
                </div>
                <button onClick={openAddProduct}
                  style={{ background: "#FF8A50", color: "white", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                  + Adicionar produto
                </button>
              </div>

              {products.length === 0 ? (
                <div style={{ background: "white", borderRadius: "16px", padding: "60px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "52px", marginBottom: "14px" }}>🏷️</div>
                  <h3 style={{ fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>Nenhum produto ainda</h3>
                  <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>Adicione seu primeiro produto e monte sua vitrine</p>
                  <button onClick={openAddProduct}
                    style={{ background: "#FF8A50", color: "white", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}>
                    + Adicionar produto
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {products.map((p) => (
                    <div key={p.id} style={{ background: "white", borderRadius: "14px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "16px" }}>
                      {/* Photo */}
                      <div style={{ width: "64px", height: "64px", background: p.active ? "#fff8f5" : "#f5f5f5", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", flexShrink: 0, overflow: "hidden" }}>
                        {p.photo
                          ? <img src={p.photo} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : catIcon(p.category)
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{catIcon(p.category)} {catLabel(p.category)}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                          <span style={{ fontWeight: 700, color: "#0F9D8A", fontSize: "15px" }}>R$ {p.price.toFixed(2).replace(".", ",")}</span>
                          <span style={{ fontSize: "11px", color: "#888" }}>Estoque: {p.stock}</span>
                          <span style={{ fontSize: "11px", color: "#888" }}>{p.sales} vendidos</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                        <button onClick={() => toggleProduct(p.id)}
                          style={{ background: p.active ? "#e8f5e9" : "#f5f5f5", color: p.active ? "#2e7d32" : "#999", border: "none", borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                          {p.active ? "✅ Ativo" : "⏸ Inativo"}
                        </button>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => openEditProduct(p)}
                            style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => setDeleteConfirm(p.id)}
                            style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ PEDIDOS ══════════════ */}
          {tab === "pedidos" && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>Pedidos recebidos</h2>
                {/* Filter */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {(["Todos", "Aguardando", "Confirmado", "Enviado", "Entregue", "Cancelado"] as const).map((f) => (
                    <button key={f} onClick={() => setOrderFilter(f)}
                      style={{
                        padding: "6px 14px", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                        background: orderFilter === f ? "#FF8A50" : "white",
                        color: orderFilter === f ? "white" : "#666",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      }}>
                      {f} {f !== "Todos" && orders.filter(o => o.status === f).length > 0 && `(${orders.filter(o => o.status === f).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div style={{ background: "white", borderRadius: "16px", padding: "48px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
                  <p style={{ color: "#888", fontSize: "14px" }}>Nenhum pedido com esse status</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {filteredOrders.map((o) => {
                    const sm = STATUS_META[o.status];
                    return (
                      <div key={o.id} style={{ background: "white", borderRadius: "14px", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        {/* Header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div>
                            <span style={{ fontSize: "11px", color: "#aaa", fontWeight: 600 }}>{o.id}</span>
                            <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", marginTop: "1px" }}>{o.customer}</div>
                            <div style={{ fontSize: "12px", color: "#888" }}>📍 {o.localidade}</div>
                          </div>
                          <span style={{ background: sm.bg, color: sm.text, fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px" }}>
                            {o.status}
                          </span>
                        </div>

                        {/* Product row */}
                        <div style={{ background: "#f8f8f8", borderRadius: "10px", padding: "10px 14px", marginBottom: "10px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>{o.product}</div>
                          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Qtd: {o.qty} · {o.date}</div>
                        </div>

                        {/* Footer */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <a href={`https://wa.me/55${o.customerPhone}`} target="_blank" rel="noopener noreferrer"
                              style={{ background: "#e8f5e9", color: "#2e7d32", fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "8px", textDecoration: "none" }}>
                              💬 WhatsApp
                            </a>
                            {sm.next && (
                              <button onClick={() => advanceOrder(o.id)}
                                style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                → {sm.next}
                              </button>
                            )}
                            {o.status !== "Entregue" && o.status !== "Cancelado" && (
                              <button onClick={() => cancelOrder(o.id)}
                                style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                Cancelar
                              </button>
                            )}
                          </div>
                          <span style={{ fontWeight: 700, color: "#0F9D8A", fontSize: "16px" }}>R$ {o.total.toFixed(2).replace(".", ",")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════ CONFIG ══════════════ */}
          {tab === "config" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Configurações da loja</h2>
                {configSaved && <span style={{ color: "#0F9D8A", fontSize: "13px", fontWeight: 600 }}>✓ Salvo!</span>}
              </div>

              <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {configEditMode ? (
                  <div>
                    {/* ─── Capa ─── */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "8px" }}>📸 Foto de capa (banner)</label>
                      <div style={{ position: "relative", width: "100%", height: "130px", background: configForm.storeCover ? "transparent" : "#f0f4ff", borderRadius: "14px", overflow: "hidden", border: "2px dashed #c0c8f0", cursor: uploadingCover ? "not-allowed" : "pointer" }}
                        onClick={() => !uploadingCover && coverInputRef.current?.click()}>
                        {uploadingCover
                          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "6px" }}>
                              <span style={{ fontSize: "22px" }}>⏳</span>
                              <span style={{ fontSize: "12px", color: "#7986cb", fontWeight: 600 }}>Enviando imagem...</span>
                            </div>
                          : configForm.storeCover
                            ? <img src={configForm.storeCover} alt="capa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "6px" }}>
                                <span style={{ fontSize: "30px" }}>🖼️</span>
                                <span style={{ fontSize: "12px", color: "#7986cb", fontWeight: 600 }}>Clique para adicionar capa</span>
                              </div>
                        }
                        {!uploadingCover && (
                          <div style={{ position: "absolute", bottom: "8px", right: "8px", display: "flex", gap: "6px" }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                              style={{ background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                              {configForm.storeCover ? "Trocar" : "Adicionar"}
                            </button>
                            {configForm.storeCover && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setConfigForm(f => ({ ...f, storeCover: "" })); }}
                                style={{ background: "rgba(200,50,50,0.8)", color: "white", border: "none", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                                Remover
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <input ref={coverInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleCoverUpload} style={{ display: "none" }} />
                    </div>

                    {/* ─── Logo ─── */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "8px" }}>🏷️ Logo da loja</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "14px", overflow: "hidden", background: "#f5f5f5", border: "2px dashed #ddd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                          onClick={() => logoInputRef.current?.click()}>
                          {configForm.storeLogo
                            ? <img src={configForm.storeLogo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: "28px" }}>🏪</span>
                          }
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            style={{ background: uploadingLogo ? "#f5f5f5" : "#fff8f5", color: "#FF8A50", border: "1.5px solid #FF8A50", borderRadius: "8px", padding: "7px 14px", fontWeight: 700, fontSize: "12px", cursor: uploadingLogo ? "not-allowed" : "pointer", opacity: uploadingLogo ? 0.7 : 1 }}>
                            {uploadingLogo ? "⏳ Enviando..." : configForm.storeLogo ? "Trocar logo" : "Adicionar logo"}
                          </button>
                          {configForm.storeLogo && !uploadingLogo && (
                            <button type="button" onClick={() => setConfigForm(f => ({ ...f, storeLogo: "" }))}
                              style={{ background: "#ffebee", color: "#c62828", border: "none", borderRadius: "8px", padding: "7px 14px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                              Remover
                            </button>
                          )}
                          <span style={{ fontSize: "10px", color: "#aaa" }}>JPG, PNG ou WebP · Até 5MB</span>
                        </div>
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleLogoUpload} style={{ display: "none" }} />
                    </div>

                    {/* ─── Nome e dados básicos ─── */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Nome da loja *</label>
                      <input type="text" value={configForm.storeName}
                        onChange={(e) => setConfigForm({ ...configForm, storeName: e.target.value })}
                        placeholder="Ex: Cosméticos da Maria"
                        style={{ ...inputSt, borderColor: "#FF8A50" }} />
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Categoria da loja *</label>
                      <select value={configForm.storeCategory}
                        onChange={(e) => setConfigForm({ ...configForm, storeCategory: e.target.value })}
                        style={{ ...inputSt, borderColor: "#FF8A50", background: "white", cursor: "pointer" }}>
                        <option value="">Selecione</option>
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Descrição da loja</label>
                      <textarea value={configForm.storeBio}
                        onChange={(e) => setConfigForm({ ...configForm, storeBio: e.target.value })}
                        placeholder="Conte sobre sua loja, produtos e diferenciais..."
                        rows={3}
                        style={{ ...inputSt, borderColor: "#FF8A50", resize: "vertical" as const, lineHeight: 1.6 }} />
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Horário de funcionamento</label>
                      <input type="text" value={configForm.storeHours}
                        onChange={(e) => setConfigForm({ ...configForm, storeHours: e.target.value })}
                        placeholder="Ex: Seg–Sex: 8h–18h · Sáb: 8h–13h"
                        style={{ ...inputSt, borderColor: "#FF8A50" }} />
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Localidade da loja</label>
                      <select value={configForm.storeLocalidade}
                        onChange={(e) => setConfigForm({ ...configForm, storeLocalidade: e.target.value as Localidade | "" })}
                        style={{ ...inputSt, borderColor: "#FF8A50", background: "white", cursor: "pointer" }}>
                        <option value="">Selecione</option>
                        {LOCALIDADES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>

                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Endereço (opcional)</label>
                      <input type="text" value={configForm.storeAddress}
                        onChange={(e) => setConfigForm({ ...configForm, storeAddress: e.target.value })}
                        placeholder="Rua, número — ex: Rua das Flores, 42"
                        style={{ ...inputSt, borderColor: "#FF8A50" }} />
                    </div>

                    {/* ─── WhatsApp Comercial ─── */}
                    <div style={{ marginBottom: "18px", padding: "14px 16px", background: "#f0fff8", border: "1.5px solid #b2f5e0", borderRadius: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1a7a50", marginBottom: "8px" }}>💬 WhatsApp Comercial</div>
                      <input type="tel" value={configForm.storeWhatsapp}
                        onChange={(e) => setConfigForm({ ...configForm, storeWhatsapp: e.target.value.replace(/\D/g, "") })}
                        placeholder="5571999990001 (com DDD e código do país)"
                        style={{ ...inputSt, borderColor: "#25D366" }} />
                      <p style={{ fontSize: "11px", color: "#888", margin: "6px 0 0" }}>Esse número aparece para clientes ao clicar em "Falar com a Loja".</p>
                    </div>

                    {/* ─── Dados pessoais ─── */}
                    <div style={{ marginBottom: "14px", padding: "14px", background: "#fafafa", border: "1px solid #eee", borderRadius: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#888", marginBottom: "10px" }}>👤 Dados pessoais</div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Seu nome</label>
                        <input type="text" value={configForm.name}
                          onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                          style={{ ...inputSt }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Telefone pessoal</label>
                        <input type="tel" value={configForm.phone}
                          onChange={(e) => setConfigForm({ ...configForm, phone: e.target.value })}
                          style={{ ...inputSt }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={saveConfig} style={{ flex: 1, padding: "13px", background: "#FF8A50", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                        💾 Salvar perfil
                      </button>
                      <button onClick={() => setConfigEditMode(false)} style={{ flex: 1, padding: "13px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* ─── Profile preview ─── */}
                    {/* Cover */}
                    {user.storeCover && (
                      <div style={{ width: "100%", height: "120px", borderRadius: "12px", overflow: "hidden", marginBottom: "16px", position: "relative" }}>
                        <img src={user.storeCover} alt="capa" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />
                      </div>
                    )}

                    {/* Logo + name row */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px" }}>
                      <div style={{ width: "72px", height: "72px", borderRadius: "14px", overflow: "hidden", background: "#f5f5f5", border: "2px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", flexShrink: 0 }}>
                        {user.storeLogo
                          ? <img src={user.storeLogo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span>{catIcon(user.storeCategory || "")}</span>
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "17px", color: "#1a1a1a", lineHeight: 1.2 }}>{user.storeName || user.name}</div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>{catIcon(user.storeCategory || "")} {catLabel(user.storeCategory || "Comerciante")}</div>
                        {user.storeBio && (
                          <div style={{ fontSize: "12px", color: "#555", marginTop: "6px", lineHeight: 1.5, padding: "8px 10px", background: "#f8f9fa", borderRadius: "8px", borderLeft: "3px solid #0F9D8A" }}>
                            {user.storeBio}
                          </div>
                        )}
                      </div>
                    </div>

                    {[
                      { label: "Nome do responsável", value: user.name, icon: "👤" },
                      { label: "E-mail", value: user.email, icon: "📧" },
                      { label: "Telefone pessoal", value: user.phone, icon: "📱" },
                    ].map((item) => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <span style={{ fontSize: "18px" }}>{item.icon}</span>
                        <div>
                          <div style={{ fontSize: "11px", color: "#999" }}>{item.label}</div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 500 }}>{item.value}</div>
                        </div>
                      </div>
                    ))}

                    {user.storeHours && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <span style={{ fontSize: "18px" }}>🕐</span>
                        <div>
                          <div style={{ fontSize: "11px", color: "#999" }}>Horário de funcionamento</div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 500 }}>{user.storeHours}</div>
                        </div>
                      </div>
                    )}

                    {user.storeLocalidade && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                        <span style={{ fontSize: "18px" }}>📍</span>
                        <div>
                          <div style={{ fontSize: "11px", color: "#999" }}>Localidade</div>
                          <div style={{ fontSize: "14px", color: "#333", fontWeight: 500 }}>
                            {LOCALIDADES.find(l => l.value === user.storeLocalidade)?.label || user.storeLocalidade}
                          </div>
                          {user.storeAddress && (
                            <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{user.storeAddress}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Comercial block */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <span style={{ fontSize: "18px" }}>💬</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "11px", color: "#999" }}>WhatsApp Comercial</div>
                        {user.storeWhatsapp ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                            <span style={{ fontSize: "14px", color: "#25A244", fontWeight: 700 }}>+{user.storeWhatsapp}</span>
                            <a
                              href={`https://wa.me/${user.storeWhatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: "11px", background: "#25D366", color: "white", padding: "3px 10px", borderRadius: "20px", fontWeight: 600, textDecoration: "none" }}
                            >
                              Testar
                            </a>
                          </div>
                        ) : (
                          <div style={{ fontSize: "13px", color: "#e07020", fontWeight: 500, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                            ⚠️ Não configurado — clientes não conseguirão te contatar pelo WhatsApp
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
                      <a href={`/seller/${user.id}`}
                        style={{ flex: 1, minWidth: "140px", padding: "12px", background: "#f0faf9", color: "#0F9D8A", border: "1.5px solid #0F9D8A", borderRadius: "10px", fontWeight: 700, cursor: "pointer", textDecoration: "none", textAlign: "center", fontSize: "13px" }}>
                        🌐 Ver loja pública
                      </a>
                      <button onClick={() => setConfigEditMode(true)}
                        style={{ flex: 1, minWidth: "120px", padding: "12px", background: "#fff8f5", color: "#FF8A50", border: "1.5px solid #FF8A50", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>
                        ✏️ Editar loja
                      </button>
                      <button onClick={handleLogout}
                        style={{ padding: "12px 18px", background: "#fff0f0", color: "#e53935", border: "1.5px solid #ffcdd2", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Seção de Entrega ── */}
              <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>🚚 Configurações de Entrega</h3>
                    <p style={{ fontSize: "12px", color: "#888", margin: "3px 0 0" }}>Informe como funciona a entrega dos seus produtos</p>
                  </div>
                  {deliverySaved && <span style={{ color: "#0F9D8A", fontSize: "13px", fontWeight: 600 }}>✓ Salvo!</span>}
                </div>

                {deliveryEditMode ? (
                  <div>
                    {/* Modalidades */}
                    <div style={{ marginBottom: "18px" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "10px" }}>Modalidades disponíveis</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Entrega própria */}
                        <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: `2px solid ${deliveryForm.ownDelivery ? "#0F9D8A" : "#e0e0e0"}`, borderRadius: "12px", cursor: "pointer", background: deliveryForm.ownDelivery ? "#f0faf9" : "white", transition: "all 0.15s" }}>
                          <input type="checkbox" checked={deliveryForm.ownDelivery} onChange={(e) => setDeliveryForm(f => ({ ...f, ownDelivery: e.target.checked }))}
                            style={{ width: "18px", height: "18px", accentColor: "#0F9D8A", cursor: "pointer" }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#1a1a1a" }}>🛵 Entrega própria</div>
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "1px" }}>Você mesmo faz a entrega ao cliente</div>
                          </div>
                        </label>

                        {/* Retirada no local */}
                        <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: `2px solid ${deliveryForm.pickup ? "#FF8A50" : "#e0e0e0"}`, borderRadius: "12px", cursor: "pointer", background: deliveryForm.pickup ? "#fff8f5" : "white", transition: "all 0.15s" }}>
                          <input type="checkbox" checked={deliveryForm.pickup} onChange={(e) => setDeliveryForm(f => ({ ...f, pickup: e.target.checked }))}
                            style={{ width: "18px", height: "18px", accentColor: "#FF8A50", cursor: "pointer" }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#1a1a1a" }}>🏪 Retirada no local</div>
                            <div style={{ fontSize: "11px", color: "#888", marginTop: "1px" }}>Cliente retira no seu endereço</div>
                          </div>
                        </label>

                        {/* Marketplace (em breve) */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: "12px", background: "#fafafa", opacity: 0.7 }}>
                          <input type="checkbox" disabled style={{ width: "18px", height: "18px" }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#aaa" }}>🚀 Entrega pelo marketplace</div>
                            <div style={{ fontSize: "11px", color: "#bbb", marginTop: "1px" }}>Em breve — entregadores parceiros do Saubara Meu Market</div>
                          </div>
                          <span style={{ marginLeft: "auto", background: "#e0f0ff", color: "#1565c0", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>Em breve</span>
                        </div>
                      </div>
                    </div>

                    {/* Valor da entrega */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Valor da entrega</label>
                      <input type="text" value={deliveryForm.deliveryFee || ""}
                        onChange={(e) => setDeliveryForm(f => ({ ...f, deliveryFee: e.target.value }))}
                        placeholder='Ex: "R$ 5,00" ou "Grátis acima de R$ 50" ou "A combinar"'
                        style={{ ...inputSt }} />
                    </div>

                    {/* Tempo estimado */}
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Tempo estimado de entrega</label>
                      <input type="text" value={deliveryForm.estimatedTime || ""}
                        onChange={(e) => setDeliveryForm(f => ({ ...f, estimatedTime: e.target.value }))}
                        placeholder='Ex: "30-60 minutos" ou "Mesmo dia até 18h"'
                        style={{ ...inputSt }} />
                    </div>

                    {/* Observações */}
                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Observações</label>
                      <textarea value={deliveryForm.notes || ""}
                        onChange={(e) => setDeliveryForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder='"Entregamos apenas em Saubara." ou "Retirada disponível em horário comercial."'
                        rows={3}
                        style={{ ...inputSt, resize: "vertical", lineHeight: 1.5 }} />
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={saveDelivery}
                        style={{ flex: 1, padding: "12px", background: "#0F9D8A", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>
                        Salvar configuração
                      </button>
                      <button onClick={() => setDeliveryEditMode(false)}
                        style={{ flex: 1, padding: "12px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Resumo das modalidades */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "20px", background: user.deliveryConfig?.ownDelivery ? "#f0faf9" : "#f5f5f5", border: `1.5px solid ${user.deliveryConfig?.ownDelivery ? "#0F9D8A" : "#e0e0e0"}` }}>
                        <span style={{ fontSize: "15px" }}>🛵</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: user.deliveryConfig?.ownDelivery ? "#0F9D8A" : "#bbb" }}>
                          Entrega própria
                        </span>
                        {user.deliveryConfig?.ownDelivery ? (
                          <span style={{ fontSize: "11px", color: "#0F9D8A", fontWeight: 800 }}>✓</span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#ccc" }}>✗</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "20px", background: user.deliveryConfig?.pickup ? "#fff8f5" : "#f5f5f5", border: `1.5px solid ${user.deliveryConfig?.pickup ? "#FF8A50" : "#e0e0e0"}` }}>
                        <span style={{ fontSize: "15px" }}>🏪</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: user.deliveryConfig?.pickup ? "#FF8A50" : "#bbb" }}>
                          Retirada no local
                        </span>
                        {user.deliveryConfig?.pickup ? (
                          <span style={{ fontSize: "11px", color: "#FF8A50", fontWeight: 800 }}>✓</span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#ccc" }}>✗</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "20px", background: "#f5f5f5", border: "1.5px solid #e8e8e8", opacity: 0.6 }}>
                        <span style={{ fontSize: "15px" }}>🚀</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#ccc" }}>Marketplace</span>
                        <span style={{ fontSize: "10px", color: "#1565c0", fontWeight: 700, background: "#e0f0ff", padding: "1px 6px", borderRadius: "10px" }}>Em breve</span>
                      </div>
                    </div>

                    {/* Detalhes */}
                    {(user.deliveryConfig?.deliveryFee || user.deliveryConfig?.estimatedTime || user.deliveryConfig?.notes) ? (
                      <div style={{ background: "#f8f8f8", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
                        {user.deliveryConfig.deliveryFee && (
                          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                            <span style={{ color: "#888", minWidth: "130px", fontWeight: 600 }}>💰 Valor da entrega:</span>
                            <span style={{ color: "#333", fontWeight: 500 }}>{user.deliveryConfig.deliveryFee}</span>
                          </div>
                        )}
                        {user.deliveryConfig.estimatedTime && (
                          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                            <span style={{ color: "#888", minWidth: "130px", fontWeight: 600 }}>⏱️ Tempo estimado:</span>
                            <span style={{ color: "#333", fontWeight: 500 }}>{user.deliveryConfig.estimatedTime}</span>
                          </div>
                        )}
                        {user.deliveryConfig.notes && (
                          <div style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
                            <span style={{ color: "#888", minWidth: "130px", fontWeight: 600 }}>📝 Observações:</span>
                            <span style={{ color: "#333", fontWeight: 500, fontStyle: "italic" }}>{user.deliveryConfig.notes}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: "#fffbf0", border: "1.5px dashed #ffc94d", borderRadius: "12px", padding: "14px", marginBottom: "16px", textAlign: "center" }}>
                        <p style={{ fontSize: "13px", color: "#c07010", margin: 0, fontWeight: 500 }}>
                          ⚠️ Nenhuma configuração de entrega definida ainda
                        </p>
                        <p style={{ fontSize: "11px", color: "#888", margin: "4px 0 0" }}>
                          Clientes verão "informações de entrega não informadas" na página da sua loja
                        </p>
                      </div>
                    )}

                    <button onClick={() => setDeliveryEditMode(true)}
                      style={{ width: "100%", padding: "12px", background: "#f0faf9", color: "#0F9D8A", border: "1.5px solid #0F9D8A", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                      🚚 Editar entrega
                    </button>
                  </div>
                )}
              </div>

              {/* ── Tarifas por Localidade ── */}
              <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>💰 Tarifas por Localidade</h3>
                    <p style={{ fontSize: "12px", color: "#888", margin: "3px 0 0" }}>Defina o valor de entrega para cada localidade (0 = grátis, vazio = não atende)</p>
                  </div>
                  {deliveryRatesSaved && <span style={{ color: "#0F9D8A", fontSize: "13px", fontWeight: 600 }}>✓ Salvo!</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  {LOCALIDADES.map((loc) => (
                    <div key={loc.value} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "#555" }}>📍 {loc.label}</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={deliveryRates[loc.value] !== undefined ? deliveryRates[loc.value] : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDeliveryRates(prev => ({
                              ...prev,
                              [loc.value]: val === "" ? undefined : parseFloat(val),
                            }));
                          }}
                          placeholder="Não atende"
                          style={{ ...inputSt, width: "100%", fontSize: "13px" }}
                        />
                        <span style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap" }}>R$</span>
                      </div>
                      {deliveryRates[loc.value] === 0 && (
                        <span style={{ fontSize: "10px", color: "#0F9D8A", fontWeight: 700 }}>✓ Grátis</span>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={saveDeliveryRates}
                  style={{ width: "100%", padding: "12px", background: "#0F9D8A", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                  💾 Salvar tarifas
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══════════════ PRODUCT MODAL ══════════════ */}
      {productModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => e.target === e.currentTarget && setProductModal(m => ({ ...m, open: false }))}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* Modal header */}
            <div style={{ background: "linear-gradient(135deg, #FF8A50, #e06030)", padding: "20px 24px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "white", fontSize: "16px", fontWeight: 700, margin: 0 }}>
                {productModal.mode === "add" ? "➕ Novo produto" : "✏️ Editar produto"}
              </h3>
              <button onClick={() => setProductModal(m => ({ ...m, open: false }))}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "8px", padding: "4px 10px", cursor: "pointer", fontSize: "16px" }}>
                ✕
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              {/* Photo upload */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "8px" }}>Foto do produto</label>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "80px", height: "80px", background: "#f5f5f5", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", overflow: "hidden", flexShrink: 0, border: "2px dashed #e0e0e0" }}>
                    {productModal.product.photo
                      ? <img src={productModal.product.photo} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "📷"
                    }
                  </div>
                  <div>
                    <button
                      onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      style={{ background: uploadingPhoto ? "#f5f5f5" : "#fff8f5", color: "#FF8A50", border: "1.5px solid #FF8A50", borderRadius: "8px", padding: "8px 14px", cursor: uploadingPhoto ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "13px", opacity: uploadingPhoto ? 0.7 : 1 }}>
                      {uploadingPhoto ? "⏳ Enviando..." : productModal.product.photo ? "Trocar foto" : "Escolher foto"}
                    </button>
                    {productModal.product.photo && !uploadingPhoto && (
                      <button onClick={() => setProductModal(m => ({ ...m, product: { ...m.product, photo: undefined } }))}
                        style={{ marginLeft: "8px", background: "#ffebee", color: "#c62828", border: "none", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", fontSize: "12px" }}>
                        Remover
                      </button>
                    )}
                    {uploadError && (
                      <p style={{ fontSize: "11px", color: "#c62828", margin: "6px 0 0", background: "#ffebee", padding: "4px 8px", borderRadius: "6px" }}>
                        ⚠️ {uploadError}
                      </p>
                    )}
                    <p style={{ fontSize: "11px", color: "#aaa", margin: "6px 0 0" }}>JPG, PNG ou WebP · Até 5MB</p>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoUpload} style={{ display: "none" }} />
                  </div>
                </div>
              </div>

              {/* Name */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Nome do produto *</label>
                <input type="text" value={productModal.product.name}
                  onChange={(e) => setProductModal(m => ({ ...m, product: { ...m.product, name: e.target.value } }))}
                  placeholder="Ex: Batom Vermelho Intenso"
                  style={{ ...inputSt }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF8A50")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
              </div>

              {/* Category */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Categoria *</label>
                <select value={productModal.product.category}
                  onChange={(e) => setProductModal(m => ({ ...m, product: { ...m.product, category: e.target.value } }))}
                  style={{ ...inputSt, background: "white", cursor: "pointer" }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF8A50")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}>
                  <option value="">Selecione</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Descrição</label>
                <textarea value={productModal.product.description}
                  onChange={(e) => setProductModal(m => ({ ...m, product: { ...m.product, description: e.target.value } }))}
                  placeholder="Descreva o produto, materiais, características..."
                  rows={3}
                  style={{ ...inputSt, resize: "vertical", lineHeight: 1.5 }}
                  onFocus={(e) => (e.target.style.borderColor = "#FF8A50")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
              </div>

              {/* Price + Stock */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Preço (R$) *</label>
                  <input type="number" min="0" step="0.01" value={productModal.product.price || ""}
                    onChange={(e) => setProductModal(m => ({ ...m, product: { ...m.product, price: parseFloat(e.target.value) || 0 } }))}
                    placeholder="0,00"
                    style={inputSt}
                    onFocus={(e) => (e.target.style.borderColor = "#FF8A50")}
                    onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Estoque</label>
                  <input type="number" min="0" step="1" value={productModal.product.stock || ""}
                    onChange={(e) => setProductModal(m => ({ ...m, product: { ...m.product, stock: parseInt(e.target.value) || 0 } }))}
                    placeholder="0"
                    style={inputSt}
                    onFocus={(e) => (e.target.style.borderColor = "#FF8A50")}
                    onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
              </div>

              {/* Status toggle */}
              <div style={{ marginBottom: "22px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#f8f8f8", borderRadius: "10px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>Status do produto</div>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "1px" }}>Produtos inativos não aparecem na vitrine</div>
                </div>
                <button onClick={() => setProductModal(m => ({ ...m, product: { ...m.product, active: !m.product.active } }))}
                  style={{ background: productModal.product.active ? "#e8f5e9" : "#f5f5f5", color: productModal.product.active ? "#2e7d32" : "#999", border: "none", borderRadius: "20px", padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                  {productModal.product.active ? "✅ Ativo" : "⏸ Inativo"}
                </button>
              </div>

              {/* Submit */}
              <button onClick={saveProduct}
                disabled={!productModal.product.name.trim() || !productModal.product.category || productModal.product.price <= 0}
                style={{ width: "100%", padding: "13px", background: (!productModal.product.name.trim() || !productModal.product.category || productModal.product.price <= 0) ? "#e0e0e0" : "#FF8A50", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: (!productModal.product.name.trim() || !productModal.product.category || productModal.product.price <= 0) ? "not-allowed" : "pointer", fontSize: "15px" }}>
                {productModal.mode === "add" ? "Adicionar produto" : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DELETE CONFIRM ══════════════ */}
      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "28px 24px", maxWidth: "360px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#1a1a1a", margin: "0 0 8px" }}>Excluir produto?</h3>
            <p style={{ color: "#777", fontSize: "13px", margin: "0 0 22px" }}>
              "{products.find(p => p.id === deleteConfirm)?.name}" será removido permanentemente.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "11px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => deleteProduct(deleteConfirm)}
                style={{ flex: 1, padding: "11px", background: "#e53935", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
