import { useState, useEffect, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AdminReports } from "./admin-reports";
import AdminSupport from "./admin-support";

// ─── ErrorBoundary para capturar erros de runtime no admin ───────────────────
class AdminErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; info: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null, info: "" };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AdminDashboard] Runtime error:", error, info);
    this.setState({ error, info: info.componentStack ?? "" });
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "monospace" }}>
          <div style={{ background: "#fee2e2", borderRadius: "16px", padding: "28px 32px", maxWidth: "800px", width: "100%" }}>
            <h2 style={{ color: "#991b1b", margin: "0 0 12px", fontSize: "18px" }}>❌ Erro no painel admin</h2>
            <pre style={{ background: "#fff", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#333", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {this.state.error.toString()}
            </pre>
            <pre style={{ background: "#fff", borderRadius: "8px", padding: "12px", fontSize: "11px", color: "#555", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", marginTop: "8px", maxHeight: "200px", overflow: "auto" }}>
              {this.state.info}
            </pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: "16px", padding: "10px 20px", background: "#0f3460", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useLocation } from "wouter";
import {
  CATEGORY_META,
  type AdminSeller, type AdminClient, type AdminProduct, type SellerPhotos,
} from "../../lib/admin-data";
import {
  computeSubscriptionStatus, subscriptionDaysRemaining, getAdminUserStats,
  getAllRegisteredUsers, adminUpdateUser,
  fetchAdminStats, fetchAdminUsers, apiAdminUpdateUser,
  type StoredUser, type AdminUserStats,
} from "../../lib/auth";
import { getTicketStats, seedDemoTickets } from "../../lib/support";

// ─── Admin login — autenticação via API server-side ───────────────────────────
// Credenciais NUNCA ficam no bundle JS. O servidor verifica via /api/admin/login.
async function apiAdminLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { success: boolean; error?: string; token?: string };
    if (data.success && data.token) {
      sessionStorage.setItem("saubara_admin_auth", data.token);
    }
    return { success: data.success, error: data.error };
  } catch {
    return { success: false, error: "Falha de conexão com o servidor." };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "dashboard" | "comerciantes" | "clientes" | "categorias" | "produtos" | "assinaturas" | "relatorios" | "atendimento" | "configuracoes";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Converters: StoredUser → admin display types ─────────────────────────────

function storedToSeller(u: StoredUser): AdminSeller {
  const now = new Date().toISOString();
  const trialEnd = u.subscription?.trialEndsAt || now;
  const expiresAt = u.subscription?.expiresAt || trialEnd;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    cpf: u.cpf || "",
    storeName: u.storeName || u.name,
    storeCategory: u.storeCategory || "",
    localidade: u.storeLocalidade || u.address?.localidade || "",
    registeredAt: u.registeredAt || now,
    subscription: {
      registeredAt: u.registeredAt || now,
      trialEndsAt: trialEnd,
      expiresAt,
      status: u.subscription?.status || "trial",
    },
    approvalStatus: u.approvalStatus || "pending",
    approvalNote: u.approvalNote,
    suspended: u.approvalStatus === "suspended",
    photos: {
      photoResponsavel: u.photoResponsavel,
      logoLoja: u.storeLogo,
      fotoFachada: u.storeCover,
    },
  };
}

function storedToClient(u: StoredUser): AdminClient {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    localidade: u.address?.localidade || "",
    registeredAt: u.registeredAt || new Date().toISOString(),
  };
}

function getProductsForUser(userId: string): AdminProduct[] {
  try {
    const raw = localStorage.getItem(`saubara_products_${userId}`);
    if (!raw) return [];
    const prods = JSON.parse(raw);
    return prods.map((p: { id: unknown; name: string; category: string; price: number; active: boolean; storeName?: string }) => ({
      id: String(p.id),
      name: p.name,
      storeId: `merchant-${userId}`,
      storeName: p.storeName || "",
      category: p.category,
      price: p.price,
      active: p.active,
    }));
  } catch { return []; }
}

// ─── Build real data — localStorage fallback (offline / sem backend) ─────────

function buildRealDataFallback() {
  const all = getAllRegisteredUsers();
  const sellers: AdminSeller[] = all.filter(u => u.type === "seller").map(storedToSeller);
  const clients: AdminClient[] = all.filter(u => u.type === "client").map(storedToClient);
  const products: AdminProduct[] = all
    .filter(u => u.type === "seller")
    .flatMap(u => {
      const prods = getProductsForUser(u.id);
      return prods.map(p => ({ ...p, storeName: u.storeName || u.name }));
    });
  return { sellers, clients, products };
}

/** Alias para compatibilidade de código que ainda usa buildRealData() */
const buildRealData = buildRealDataFallback;

function fmtDate(iso: string | undefined | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

function fmtDateShort(iso: string | undefined | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; }
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  trial:     { label: "Período Gratuito", bg: "#e0f2fe", text: "#0369a1", dot: "#0ea5e9" },
  active:    { label: "Ativa",            bg: "#dcfce7", text: "#166534", dot: "#22c55e" },
  expired:   { label: "Vencida",          bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  suspended: { label: "Suspensa",         bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
};

function SubscriptionBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.suspended;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: m.bg, color: m.text, fontSize: "11px", fontWeight: 700 }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.dot, display: "inline-block" }} />
      {m.label}
    </span>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await apiAdminLogin(email, pass);
    if (result.success) {
      onLogin();
    } else {
      setError(result.error || "Credenciais inválidas.");
    }
    setLoading(false);
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0",
    borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "64px", height: "64px", background: "linear-gradient(135deg, #FF8A50, #e06030)", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", margin: "0 auto 16px" }}>
            🛡️
          </div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: "0 0 4px" }}>Administração</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0 }}>Saubara Meu Market — Painel Admin</p>
        </div>

        <div style={{ background: "white", borderRadius: "20px", padding: "28px 32px", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>E-mail administrativo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Digite o e-mail administrativo" style={inp}
                onFocus={e => (e.target.style.borderColor = "#0f3460")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "5px" }}>Senha</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={inp}
                onFocus={e => (e.target.style.borderColor = "#0f3460")} onBlur={e => (e.target.style.borderColor = "#e0e0e0")} />
            </div>

            {error && (
              <div style={{ background: "#fff3f3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#c62828", fontSize: "13px" }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#ccc" : "#0f3460", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Verificando..." : "Acessar painel"}
            </button>
          </form>

          {/* Hint de sandbox removido por segurança — credenciais nunca exibidas na UI */}
        </div>

        <p style={{ textAlign: "center", marginTop: "20px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
            ← Voltar ao marketplace
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Main admin panel ─────────────────────────────────────────────────────────

// FIX-H2: validar token admin server-side ao carregar/recarregar painel
async function verifyTokenWithServer(): Promise<boolean> {
  const token = sessionStorage.getItem("saubara_admin_auth");
  if (!token) return false;
  try {
    const res = await fetch("/api/admin/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json() as { valid: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

function AdminDashboardInner() {
  const [, navigate] = useLocation();
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // FIX-H2: Verificar token com servidor ao montar o componente
  useEffect(() => {
    verifyTokenWithServer().then((valid) => {
      if (!valid) sessionStorage.removeItem("saubara_admin_auth");
      setAuthed(valid);
      setAuthChecked(true);
    });
  }, []);

  // Sellers, clients, products — Turso-first, localStorage fallback
  const [sellers, setSellers] = useState<AdminSeller[]>(() => buildRealData().sellers);
  const [clients, setClients] = useState<AdminClient[]>(() => buildRealData().clients);
  const [products, setProducts] = useState<AdminProduct[]>(() => buildRealData().products);
  const [dataSource, setDataSource] = useState<"api" | "localStorage">("localStorage");
  const [adminStats, setAdminStats] = useState<AdminUserStats | null>(null);

  // Carrega dados do Turso quando autenticado
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    async function loadFromAPI() {
      const [statsResult, usersResult] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers({ limit: 200 }),
      ]);
      if (cancelled) return;
      if (statsResult) setAdminStats(statsResult);
      if (usersResult) {
        setDataSource("api");
        // Mesclar com MOCK_SELLERS para não perder dados estáticos
        const apiSellers = usersResult.sellers.map(storedToSeller);
        const apiClients = usersResult.clients.map(storedToClient);
        // Produtos ainda vêm do localStorage (por userId)
        const produtosAPI = usersResult.sellers.flatMap(u => {
          const prods = getProductsForUser(u.id);
          return prods.map(p => ({ ...p, storeName: u.storeName || u.name }));
        });
        setSellers(apiSellers.length > 0 ? apiSellers : buildRealData().sellers);
        setClients(apiClients.length > 0 ? apiClients : buildRealData().clients);
        if (produtosAPI.length > 0) setProducts(produtosAPI);
      }
    }
    loadFromAPI();
    return () => { cancelled = true; };
  }, [authed]);

  // Refresh all data after any action
  const refreshAll = async () => {
    const usersResult = await fetchAdminUsers({ limit: 200 });
    if (usersResult) {
      setDataSource("api");
      setSellers(usersResult.sellers.map(storedToSeller));
      setClients(usersResult.clients.map(storedToClient));
    } else {
      const data = buildRealData();
      setSellers(data.sellers);
      setClients(data.clients);
      setProducts(data.products);
    }
    const statsResult = await fetchAdminStats();
    if (statsResult) setAdminStats(statsResult);
  };
  const refreshSellers = refreshAll;

  // Reject / correction modal
  const [noteModal, setNoteModal] = useState<{ open: boolean; mode: "reject" | "correction"; id: string }>({ open: false, mode: "reject", id: "" });
  const [noteText, setNoteText] = useState("");

  // Photo verification panel
  const [verifyOpen, setVerifyOpen] = useState<string | null>(null);
  const [verifyChecks, setVerifyChecks] = useState<Record<string, boolean[]>>({});
  const toggleCheck = (id: string, idx: number) => {
    setVerifyChecks(prev => {
      const cur = prev[id] ?? [false, false, false];
      const next = [...cur];
      next[idx] = !next[idx];
      return { ...prev, [id]: next };
    });
  };
  const getChecks = (id: string) => verifyChecks[id] ?? [false, false, false];

  // Filters
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerStatusFilter, setSellerStatusFilter] = useState<string>("todos");
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<string>("todos");

  // ── Open support tickets badge (moved UP — must be before early returns) ──
  const [openTickets, setOpenTickets] = useState(0);
  useEffect(() => {
    seedDemoTickets();
    setOpenTickets(getTicketStats().aberto);
  }, [tab]); // refresh count whenever tab changes

  // Aguardar verificação server-side antes de renderizar
  if (!authChecked) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f172a" }}>
      <div style={{ color: "#94a3b8", fontSize: "14px" }}>Verificando acesso…</div>
    </div>
  );
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  // ── Seller actions — S2.3: API-first, localStorage fallback ──────────────

  const approveSeller = async (id: string) => {
    const ok = await apiAdminUpdateUser(id, { approvalStatus: "approved", approvalNote: null });
    if (!ok) adminUpdateUser(id, { approvalStatus: "approved", approvalNote: undefined }); // fallback
    refreshSellers();
  };

  const rejectSeller = async (id: string, note: string) => {
    const ok = await apiAdminUpdateUser(id, { approvalStatus: "rejected", approvalNote: note });
    if (!ok) adminUpdateUser(id, { approvalStatus: "rejected", approvalNote: note });
    refreshSellers();
  };

  const requestCorrection = async (id: string, note: string) => {
    const ok = await apiAdminUpdateUser(id, { approvalStatus: "pending", approvalNote: note });
    if (!ok) adminUpdateUser(id, { approvalStatus: "pending", approvalNote: note });
    refreshSellers();
  };

  const suspendSeller = async (id: string) => {
    const ok = await apiAdminUpdateUser(id, { approvalStatus: "suspended", subscriptionStatus: "suspended" });
    if (!ok) {
      // fallback localStorage
      const user = getAllRegisteredUsers().find(u => u.id === id);
      const sub = user?.subscription ? { ...user.subscription, status: "suspended" as const } : undefined;
      adminUpdateUser(id, { approvalStatus: "suspended", ...(sub ? { subscription: sub } : {}) });
    }
    refreshSellers();
  };

  const reactivateSeller = async (id: string) => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    const ok = await apiAdminUpdateUser(id, {
      approvalStatus: "approved",
      subscriptionStatus: "trial",
      subscriptionExpiresAt: trialEnd.toISOString(),
    });
    if (!ok) {
      // fallback localStorage
      const user = getAllRegisteredUsers().find(u => u.id === id);
      const sub = user?.subscription
        ? { ...user.subscription, expiresAt: trialEnd.toISOString(), status: "trial" as const }
        : { registeredAt: new Date().toISOString(), trialEndsAt: trialEnd.toISOString(), expiresAt: trialEnd.toISOString(), status: "trial" as const };
      adminUpdateUser(id, { approvalStatus: "approved", subscription: sub });
    }
    refreshSellers();
  };

  const openNoteModal = (mode: "reject" | "correction", id: string) => {
    setNoteText("");
    setNoteModal({ open: true, mode, id });
  };

  const submitNoteModal = () => {
    if (noteModal.mode === "reject") rejectSeller(noteModal.id, noteText);
    else requestCorrection(noteModal.id, noteText);
    setNoteModal({ open: false, mode: "reject", id: "" });
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalSellers = sellers.length;
  const totalClients = clients.length;
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const activeStoresCount = sellers.filter(s => s.approvalStatus === "approved" && !s.suspended && (s.subscription?.status === "active" || s.subscription?.status === "trial")).length;
  const trialStores = sellers.filter(s => s.subscription?.status === "trial" && s.approvalStatus === "approved" && !s.suspended).length;
  const suspendedStores = sellers.filter(s => s.approvalStatus === "suspended" || s.subscription?.status === "suspended" || s.subscription?.status === "expired").length;
  const pendingApproval = sellers.filter(s => s.approvalStatus === "pending").length;

  // ── Filtered sellers ──────────────────────────────────────────────────────

  const filteredSellers = sellers.filter(s => {
    const q = sellerSearch.toLowerCase();
    const matchSearch = !q || (s.name||"").toLowerCase().includes(q) || (s.storeName||"").toLowerCase().includes(q) || (s.email||"").toLowerCase().includes(q) || (s.cpf||"").includes(q);
    const matchStatus = sellerStatusFilter === "todos"
      || sellerStatusFilter === s.approvalStatus
      || (sellerStatusFilter === "trial"     && s.approvalStatus === "approved" && !s.suspended && s.subscription?.status === "trial")
      || (sellerStatusFilter === "active"    && s.approvalStatus === "approved" && !s.suspended && s.subscription?.status === "active")
      || (sellerStatusFilter === "expired"   && s.approvalStatus === "approved" && !s.suspended && s.subscription?.status === "expired");
    return matchSearch && matchStatus;
  });

  const filteredClients = clients.filter(c => {
    const q = clientSearch.toLowerCase();
    return !q || (c.name||"").toLowerCase().includes(q) || (c.email||"").toLowerCase().includes(q) || (c.phone||"").includes(q);
  });

  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    return !q || (p.name||"").toLowerCase().includes(q) || (p.storeName||"").toLowerCase().includes(q);
  });

  const filteredSubs = sellers.filter(s => {
    const status = s.suspended ? "suspended" : (s.subscription?.status ?? "trial");
    return subStatusFilter === "todos" || status === subStatusFilter;
  });

  // ── Styles ────────────────────────────────────────────────────────────────

  const S = {
    card: { background: "white", borderRadius: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" } as React.CSSProperties,
    th: { padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#888", textTransform: "uppercase" as const, letterSpacing: "0.05em", background: "#f9fafb", borderBottom: "1px solid #f0f0f0", textAlign: "left" as const },
    td: { padding: "12px 16px", fontSize: "13px", color: "#333", borderBottom: "1px solid #f8f8f8" },
    searchInput: { padding: "9px 14px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "13px", outline: "none", fontFamily: "inherit", width: "220px" } as React.CSSProperties,
    select: { padding: "9px 14px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "13px", outline: "none", fontFamily: "inherit", background: "white", cursor: "pointer" } as React.CSSProperties,
    btn: (color: string, bg: string) => ({ padding: "5px 12px", background: bg, color, border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" } as React.CSSProperties),
  };

  // ── Nav items ─────────────────────────────────────────────────────────────

  const NAV: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: "dashboard",     icon: "📊", label: "Dashboard" },
    { key: "comerciantes",  icon: "🏪", label: "Comerciantes", badge: pendingApproval || undefined },
    { key: "clientes",      icon: "👥", label: "Clientes" },
    { key: "categorias",    icon: "🏷️", label: "Categorias" },
    { key: "produtos",      icon: "📦", label: "Produtos" },
    { key: "assinaturas",   icon: "💳", label: "Assinaturas" },
    { key: "relatorios",    icon: "📈", label: "Relatórios" },
    { key: "atendimento",   icon: "🎯", label: "Atendimento", badge: openTickets || undefined },
    { key: "configuracoes", icon: "⚙️", label: "Configurações" },
  ];

  const logout = () => { sessionStorage.removeItem("saubara_admin_auth"); setAuthed(false); };

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", minHeight: "100vh", background: "#f0f2f5", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: "58px", gap: "12px" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "white", fontSize: "20px", padding: "4px" }}>☰</button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #FF8A50, #e06030)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🛡️</div>
            <div>
              <span style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>Admin</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginLeft: "6px" }}>Saubara Meu Market</span>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {pendingApproval > 0 && (
            <div style={{ background: "#FF8A50", color: "white", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" }}>
              {pendingApproval} pendente{pendingApproval > 1 ? "s" : ""}
            </div>
          )}

          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>
            🛍️ Marketplace
          </button>
          <button onClick={logout} style={{ background: "rgba(239,68,68,0.2)", border: "none", color: "#fca5a5", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
            Sair
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "24px 20px", gap: "24px", boxSizing: "border-box" }}>

        {/* ── Sidebar overlay mobile ── */}
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }} />}

        {/* ── Sidebar ── */}
        <aside style={{
          width: "220px", flexShrink: 0,
          position: sidebarOpen ? "fixed" : "sticky",
          top: sidebarOpen ? 0 : "82px",
          left: sidebarOpen ? 0 : "auto",
          height: sidebarOpen ? "100vh" : "fit-content",
          background: "white",
          borderRadius: sidebarOpen ? "0 16px 16px 0" : "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          zIndex: sidebarOpen ? 160 : 10,
          padding: "20px 0",
          overflowY: "auto",
        }}>
          <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #f0f0f0", marginBottom: "8px" }}>
            <div style={{ width: "44px", height: "44px", background: "linear-gradient(135deg, #1a1a2e, #0f3460)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "8px" }}>🛡️</div>
            <div style={{ fontWeight: 700, fontSize: "13px", color: "#1a1a1a" }}>Administrador</div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Saubara Meu Market</div>
          </div>

          {NAV.map(item => (
            <button key={item.key}
              onClick={() => { setTab(item.key); setSidebarOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "11px 16px", border: "none", cursor: "pointer",
                background: tab === item.key ? "#f0f2ff" : "transparent",
                color: tab === item.key ? "#1a1a2e" : "#555",
                fontWeight: tab === item.key ? 700 : 500,
                fontSize: "13px", textAlign: "left",
                borderLeft: tab === item.key ? "3px solid #1a1a2e" : "3px solid transparent",
              }}>
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              {item.label}
              {(item.badge ?? 0) > 0 && (
                <span style={{ marginLeft: "auto", background: "#FF8A50", color: "white", fontSize: "10px", fontWeight: 700, borderRadius: "20px", padding: "2px 7px" }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div style={{ margin: "12px 16px 0", borderTop: "1px solid #f0f0f0", paddingTop: "12px" }}>
            <button onClick={logout} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", border: "none", background: "none", cursor: "pointer", color: "#e53935", fontSize: "13px", fontWeight: 600 }}>
              🚪 Sair do painel
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ════════════════════════ DASHBOARD ════════════════════════ */}
          {tab === "dashboard" && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Dashboard</h1>
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Visão geral do marketplace</p>
              </div>

              {/* KPI grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "28px" }}>
                {[
                  { label: "Comerciantes",       value: totalSellers,        icon: "🏪", color: "#1E88E5", bg: "#e3f2fd" },
                  { label: "Clientes",            value: totalClients,        icon: "👥", color: "#6a1b9a", bg: "#f3e5f5" },
                  { label: "Produtos cadastrados",value: totalProducts,       icon: "📦", color: "#0F9D8A", bg: "#e0f7f4" },
                  { label: "Produtos ativos",     value: activeProducts,      icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
                  { label: "Lojas ativas",        value: activeStoresCount,   icon: "🟢", color: "#2e7d32", bg: "#e8f5e9" },
                  { label: "Em período gratuito", value: trialStores,         icon: "🎁", color: "#0369a1", bg: "#e0f2fe" },
                  { label: "Lojas suspensas",     value: suspendedStores,     icon: "🔴", color: "#c62828", bg: "#ffebee" },
                  { label: "Aguardando aprovação",value: pendingApproval,     icon: "⏳", color: "#FF8A50", bg: "#fff8f5" },
                ].map(k => (
                  <div key={k.label} style={{ background: "white", borderRadius: "14px", padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: "36px", height: "36px", background: k.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "10px" }}>
                      {k.icon}
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", lineHeight: 1.3 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Real registered users stats — S2.3: Turso-first, localStorage fallback */}
              {(() => {
                const stats = adminStats ?? getAdminUserStats();
                const recentUsers = stats.recentUsers ?? [];
                const sourceLabel = adminStats ? "dados do Turso" : "dados do localStorage";
                const sourceBadge = adminStats
                  ? { color: "#0F9D8A", bg: "#e0f7f4" }
                  : { color: "#888", bg: "#f0f0f0" };
                return (
                  <div style={{ marginBottom: "28px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                      👤 Usuários Reais Cadastrados
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "18px" }}>
                      {[
                        { label: "Total Clientes",          value: stats.totalClients   ?? 0, icon: "🛒", color: "#6a1b9a", bg: "#f3e5f5" },
                        { label: "Total Comerciantes",      value: stats.totalSellers   ?? 0, icon: "🏪", color: "#1E88E5", bg: "#e3f2fd" },
                        { label: "Contas Verificadas",      value: stats.totalVerified  ?? 0, icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
                        { label: "Pendentes de Verificação",value: stats.totalPending   ?? 0, icon: "⏳", color: "#FF8A50", bg: "#fff8f5" },
                      ].map(k => (
                        <div key={k.label} style={{ background: "white", borderRadius: "14px", padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: `4px solid ${k.color}` }}>
                          <div style={{ width: "36px", height: "36px", background: k.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "10px" }}>
                            {k.icon}
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", lineHeight: 1.3 }}>{k.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent real registrations */}
                    {recentUsers.length > 0 && (
                      <div style={{ background: "white", borderRadius: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", fontWeight: 700, fontSize: "13px", color: "#1a1a1a", display: "flex", alignItems: "center", gap: "8px" }}>
                          🕐 Últimos cadastros reais
                          <span style={{ fontSize: "11px", fontWeight: 400, color: sourceBadge.color, background: sourceBadge.bg, padding: "2px 8px", borderRadius: "20px", marginLeft: "6px" }}>— {sourceLabel}</span>
                        </div>
                        {recentUsers.map(u => (
                          <div key={u.id} style={{ padding: "11px 20px", borderBottom: "1px solid #f8f8f8", display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "34px", height: "34px",
                              background: u.type === "seller" ? "linear-gradient(135deg, #FF8A50, #e06030)" : "linear-gradient(135deg, #0F9D8A, #0B7A6E)",
                              borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", fontWeight: 700, fontSize: "14px", flexShrink: 0,
                            }}>
                              {(u.name||"?").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                              <div style={{ fontSize: "11px", color: "#888" }}>{u.email} · {u.type === "seller" ? "Comerciante" : "Cliente"}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                              <span style={{
                                padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
                                background: u.emailVerified ? "#dcfce7" : "#fff3cd",
                                color: u.emailVerified ? "#166534" : "#92400e",
                              }}>
                                {u.emailVerified ? "✓ Verificado" : "⏳ Pendente"}
                              </span>
                              <span style={{ fontSize: "11px", color: "#bbb" }}>
                                {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString("pt-BR") : "—"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recent sellers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Últimos cadastros */}
                <div style={S.card}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", fontWeight: 700, fontSize: "14px", color: "#1a1a1a" }}>🏪 Últimos comerciantes</div>
                  {[...sellers].sort((a,b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()).slice(0,5).map(s => {
                    const status = s.suspended ? "suspended" : (s.subscription?.status ?? "trial");
                    return (
                      <div key={s.id} style={{ padding: "12px 20px", borderBottom: "1px solid #f8f8f8", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #FF8A50, #e06030)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                          {(s.storeName||"?").charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.storeName}</div>
                          <div style={{ fontSize: "11px", color: "#888" }}>{fmtDate(s.registeredAt)}</div>
                        </div>
                        <SubscriptionBadge status={status} />
                      </div>
                    );
                  })}
                </div>

                {/* Status assinaturas */}
                <div style={S.card}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", fontWeight: 700, fontSize: "14px", color: "#1a1a1a" }}>💳 Status das assinaturas</div>
                  <div style={{ padding: "20px" }}>
                    {[
                      { key: "trial",     label: "Período gratuito", count: sellers.filter(s => s.subscription?.status === "trial" && !s.suspended).length },
                      { key: "active",    label: "Ativas",           count: sellers.filter(s => s.subscription?.status === "active" && !s.suspended).length },
                      { key: "expired",   label: "Vencidas",         count: sellers.filter(s => s.subscription?.status === "expired" && !s.suspended).length },
                      { key: "suspended", label: "Suspensas",        count: sellers.filter(s => s.suspended).length },
                    ].map(item => {
                      const m = STATUS_META[item.key];
                      const pct = totalSellers > 0 ? Math.round((item.count / totalSellers) * 100) : 0;
                      return (
                        <div key={item.key} style={{ marginBottom: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>{item.label}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: m.text }}>{item.count}</span>
                          </div>
                          <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: m.dot, borderRadius: "4px", transition: "width 0.4s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pending approval alert */}
              {pendingApproval > 0 && (
                <div style={{ marginTop: "20px", background: "#fff8f5", border: "1.5px solid #FF8A50", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#c05a20" }}>{pendingApproval} comerciante{pendingApproval > 1 ? "s" : ""} aguardando aprovação</div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Acesse a aba "Comerciantes" para revisar e aprovar os cadastros.</div>
                  </div>
                  <button onClick={() => setTab("comerciantes")} style={S.btn("white", "#FF8A50")}>Ver agora →</button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════ COMERCIANTES ════════════════════════ */}
          {tab === "comerciantes" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Comerciantes</h1>
                  <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>{sellers.length} cadastrados</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input placeholder="Buscar por nome, loja, CPF..." value={sellerSearch} onChange={e => setSellerSearch(e.target.value)} style={S.searchInput} />
                  <select value={sellerStatusFilter} onChange={e => setSellerStatusFilter(e.target.value)} style={S.select}>
                    <option value="todos">Todos os status</option>
                    <option value="pending">⏳ Aguardando aprovação</option>
                    <option value="approved">✅ Aprovados</option>
                    <option value="rejected">❌ Rejeitados</option>
                    <option value="suspended">⛔ Suspensos</option>
                    <option value="trial">🎁 Período gratuito</option>
                    <option value="active">🟢 Assinatura ativa</option>
                    <option value="expired">🔴 Assinatura vencida</option>
                  </select>
                </div>
              </div>

              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Comerciante</th>
                        <th style={S.th}>CPF</th>
                        <th style={S.th}>Categoria</th>
                        <th style={S.th}>Localidade</th>
                        <th style={S.th}>Cadastro</th>
                        <th style={S.th}>Assinatura</th>
                        <th style={S.th}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSellers.map(s => {
                        const subStatus = s.suspended ? "suspended" : (s.subscription?.status ?? "trial");
                        const days = subscriptionDaysRemaining(s.subscription ?? { status: "trial", registeredAt: new Date().toISOString(), trialEndsAt: new Date().toISOString(), expiresAt: new Date().toISOString() });
                        const cat = CATEGORY_META[s.storeCategory];
                        const APPROVAL_META: Record<string, { label: string; color: string; bg: string }> = {
                          pending:   { label: "⏳ Aguardando aprovação", color: "#92400e", bg: "#fef3c7" },
                          approved:  { label: "✅ Aprovado",             color: "#166534", bg: "#dcfce7" },
                          rejected:  { label: "❌ Rejeitado",            color: "#991b1b", bg: "#fee2e2" },
                          suspended: { label: "⛔ Suspenso",             color: "#374151", bg: "#f3f4f6" },
                        };
                        const am = APPROVAL_META[s.approvalStatus];
                        return (
                          <tr key={s.id} style={{ opacity: s.approvalStatus === "suspended" ? 0.7 : 1 }}>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #FF8A50, #e06030)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                                  {(s.storeName||"?").charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "13px" }}>{s.storeName}</div>
                                  <div style={{ fontSize: "11px", color: "#888" }}>{s.name} · {s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={S.td}><span style={{ fontFamily: "monospace", fontSize: "12px" }}>{s.cpf}</span></td>
                            <td style={S.td}>{cat ? `${cat.icon} ${cat.label}` : s.storeCategory}</td>
                            <td style={S.td}><span style={{ fontSize: "12px" }}>{s.localidade}</span></td>
                            <td style={S.td}><span style={{ fontSize: "12px" }}>{fmtDate(s.registeredAt)}</span></td>
                            <td style={S.td}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {/* Approval status */}
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", background: am.bg, color: am.color, fontSize: "10px", fontWeight: 700, width: "fit-content" }}>
                                  {am.label}
                                </span>
                                {/* Subscription status — only show if approved */}
                                {s.approvalStatus === "approved" && (
                                  <>
                                    <SubscriptionBadge status={subStatus} />
                                    {!s.suspended && subStatus !== "suspended" && (
                                      <span style={{ fontSize: "11px", color: days > 0 ? "#888" : "#e53935" }}>
                                        {days > 0 ? `${days}d restantes` : `${Math.abs(days)}d atraso`}
                                      </span>
                                    )}
                                  </>
                                )}
                                {/* Approval note preview */}
                                {s.approvalNote && (
                                  <span style={{ fontSize: "10px", color: "#666", fontStyle: "italic", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    💬 {s.approvalNote}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={S.td}>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {/* Photo review button */}
                                {(() => {
                                  const photoCount = s.photos ? [s.photos.photoResponsavel, s.photos.logoLoja, s.photos.fotoFachada].filter(Boolean).length : 0;
                                  return (
                                    <button onClick={() => setVerifyOpen(s.id)} style={{ ...S.btn("#1a1a2e", "#f0f2ff"), display: "flex", alignItems: "center", gap: "5px" }}>
                                      🖼️ Fotos
                                      {photoCount > 0 && (
                                        <span style={{ background: "#1a1a2e", color: "white", fontSize: "9px", fontWeight: 700, borderRadius: "20px", padding: "1px 5px" }}>{photoCount}/3</span>
                                      )}
                                    </button>
                                  );
                                })()}
                                {(s.approvalStatus === "pending" || s.approvalStatus === "rejected") && (
                                  <button onClick={() => approveSeller(s.id)} style={S.btn("white", "#22c55e")}>✓ Aprovar</button>
                                )}
                                {(s.approvalStatus === "pending" || s.approvalStatus === "rejected") && (
                                  <button onClick={() => openNoteModal("reject", s.id)} style={S.btn("white", "#e53935")}>✗ Rejeitar</button>
                                )}
                                {s.approvalStatus === "pending" && (
                                  <button onClick={() => openNoteModal("correction", s.id)} style={S.btn("#92400e", "#fef3c7")}>✏️ Corrigir</button>
                                )}
                                {s.approvalStatus === "approved" && !s.suspended && (
                                  <button onClick={() => suspendSeller(s.id)} style={S.btn("white", "#e53935")}>⛔ Suspender</button>
                                )}
                                {s.approvalStatus === "suspended" && (
                                  <button onClick={() => reactivateSeller(s.id)} style={S.btn("white", "#0F9D8A")}>↩ Reativar</button>
                                )}
                                {s.approvalStatus === "approved" && (s.suspended || s.subscription?.status === "expired") && (
                                  <button onClick={() => reactivateSeller(s.id)} style={S.btn("white", "#0F9D8A")}>↩ Reativar</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSellers.length === 0 && (
                        <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#aaa", padding: "32px" }}>Nenhum resultado encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ CLIENTES ════════════════════════ */}
          {tab === "clientes" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Clientes</h1>
                  <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>{clients.length} cadastrados</p>
                </div>
                <input placeholder="Buscar por nome, e-mail ou telefone..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={{ ...S.searchInput, width: "280px" }} />
              </div>

              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Cliente</th>
                        <th style={S.th}>Telefone</th>
                        <th style={S.th}>Localidade</th>
                        <th style={S.th}>Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map(c => (
                        <tr key={c.id}>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #0F9D8A, #0B7A6E)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                                {(c.name||"?").charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "13px" }}>{c.name}</div>
                                <div style={{ fontSize: "11px", color: "#888" }}>{c.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={S.td}><span style={{ fontFamily: "monospace", fontSize: "12px" }}>{c.phone}</span></td>
                          <td style={S.td}><span style={{ fontSize: "12px" }}>📍 {c.localidade}</span></td>
                          <td style={S.td}><span style={{ fontSize: "12px" }}>{fmtDate(c.registeredAt)}</span></td>
                        </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#aaa", padding: "32px" }}>Nenhum resultado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ CATEGORIAS ════════════════════════ */}
          {tab === "categorias" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Categorias</h1>
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Categorias do marketplace</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
                {Object.entries(CATEGORY_META).map(([key, meta]) => {
                  const count = sellers.filter(s => s.storeCategory === key).length;
                  const prodCount = products.filter(p => p.category === key).length;
                  return (
                    <div key={key} style={{ background: "white", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ fontSize: "32px" }}>{meta.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a1a1a" }}>{meta.label}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>{count} loja{count !== 1 ? "s" : ""} · {prodCount} produto{prodCount !== 1 ? "s" : ""}</div>
                      <div style={{ marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: "#f0f2ff", color: "#1a1a2e" }}>
                          {key}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "20px", background: "#f8f9fa", borderRadius: "12px", padding: "16px 20px", fontSize: "13px", color: "#888", border: "1.5px dashed #e0e0e0" }}>
                ℹ️ Gerenciamento de categorias disponível em breve. Atualmente as categorias são fixas no sistema.
              </div>
            </div>
          )}

          {/* ════════════════════════ PRODUTOS ════════════════════════ */}
          {tab === "produtos" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Produtos</h1>
                  <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>{products.length} cadastrados · {activeProducts} ativos</p>
                </div>
                <input placeholder="Buscar produto ou loja..." value={productSearch} onChange={e => setProductSearch(e.target.value)} style={{ ...S.searchInput, width: "260px" }} />
              </div>

              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Produto</th>
                        <th style={S.th}>Loja</th>
                        <th style={S.th}>Categoria</th>
                        <th style={S.th}>Preço</th>
                        <th style={S.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(p => {
                        const cat = CATEGORY_META[p.category];
                        return (
                          <tr key={p.id}>
                            <td style={S.td}><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                            <td style={S.td}><span style={{ fontSize: "12px", color: "#555" }}>{p.storeName}</span></td>
                            <td style={S.td}>{cat ? `${cat.icon} ${cat.label}` : p.category}</td>
                            <td style={S.td}><span style={{ fontWeight: 700, color: "#0F9D8A" }}>R$ {(p.price ?? 0).toFixed(2).replace(".", ",")}</span></td>
                            <td style={S.td}>
                              <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: p.active ? "#dcfce7" : "#f3f4f6", color: p.active ? "#166534" : "#6b7280" }}>
                                {p.active ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#aaa", padding: "32px" }}>Nenhum resultado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ ASSINATURAS ════════════════════════ */}
          {tab === "assinaturas" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Assinaturas</h1>
                  <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Controle de vigência por comerciante</p>
                </div>
                <select value={subStatusFilter} onChange={e => setSubStatusFilter(e.target.value)} style={S.select}>
                  <option value="todos">Todos os status</option>
                  <option value="trial">Período gratuito</option>
                  <option value="active">Ativas</option>
                  <option value="expired">Vencidas</option>
                  <option value="suspended">Suspensas</option>
                </select>
              </div>

              {/* summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                {[
                  { key: "trial",     label: "Período gratuito", count: sellers.filter(s => s.subscription?.status === "trial" && !s.suspended).length },
                  { key: "active",    label: "Ativas",           count: sellers.filter(s => s.subscription?.status === "active" && !s.suspended).length },
                  { key: "expired",   label: "Vencidas",         count: sellers.filter(s => s.subscription?.status === "expired" && !s.suspended).length },
                  { key: "suspended", label: "Suspensas",        count: sellers.filter(s => s.suspended).length },
                ].map(item => {
                  const m = STATUS_META[item.key];
                  return (
                    <div key={item.key} style={{ background: "white", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: "pointer", border: subStatusFilter === item.key ? `2px solid ${m.dot}` : "2px solid transparent" }}
                      onClick={() => setSubStatusFilter(subStatusFilter === item.key ? "todos" : item.key)}>
                      <div style={{ fontSize: "22px", fontWeight: 800, color: m.text }}>{item.count}</div>
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>{item.label}</div>
                    </div>
                  );
                })}
              </div>

              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Comerciante</th>
                        <th style={S.th}>Data de cadastro</th>
                        <th style={S.th}>Início período gratuito</th>
                        <th style={S.th}>Data de vencimento</th>
                        <th style={S.th}>Dias restantes</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map(s => {
                        const status = s.suspended ? "suspended" : (s.subscription?.status ?? "trial");
                        const days = subscriptionDaysRemaining(s.subscription ?? { status: "trial", registeredAt: new Date().toISOString(), trialEndsAt: new Date().toISOString(), expiresAt: new Date().toISOString() });
                        return (
                          <tr key={s.id}>
                            <td style={S.td}>
                              <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a" }}>{s.storeName}</div>
                              <div style={{ fontSize: "11px", color: "#888" }}>{s.name}</div>
                            </td>
                            <td style={S.td}><span style={{ fontSize: "12px" }}>{fmtDateShort(s.subscription?.registeredAt)}</span></td>
                            <td style={S.td}><span style={{ fontSize: "12px" }}>{fmtDateShort(s.subscription?.trialEndsAt)}</span></td>
                            <td style={S.td}><span style={{ fontSize: "12px", fontWeight: 600 }}>{fmtDateShort(s.subscription?.expiresAt)}</span></td>
                            <td style={S.td}>
                              {status === "suspended" ? (
                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>—</span>
                              ) : (
                                <span style={{ fontSize: "12px", fontWeight: 700, color: days > 7 ? "#2e7d32" : days > 0 ? "#FF8A50" : "#e53935" }}>
                                  {days > 0 ? `${days}d` : `${Math.abs(days)}d atraso`}
                                </span>
                              )}
                            </td>
                            <td style={S.td}><SubscriptionBadge status={status} /></td>
                            <td style={S.td}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {s.approvalStatus === "approved" && !s.suspended && (
                                  <button onClick={() => suspendSeller(s.id)} style={S.btn("white", "#e53935")}>⛔ Suspender</button>
                                )}
                                {(s.approvalStatus === "suspended" || (s.approvalStatus === "approved" && s.subscription?.status === "expired")) && (
                                  <button onClick={() => reactivateSeller(s.id)} style={S.btn("white", "#0F9D8A")}>↩ Reativar</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSubs.length === 0 && (
                        <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#aaa", padding: "32px" }}>Nenhum resultado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ RELATÓRIOS ════════════════════════ */}
          {tab === "relatorios" && (
            <AdminReports sellers={sellers} clients={clients} products={products} />
          )}

          {/* ════════════════════════ ATENDIMENTO ════════════════════════ */}
          {tab === "atendimento" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Central de Atendimento</h1>
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Gerencie reclamações, sugestões, denúncias e dúvidas</p>
              </div>
              <AdminSupport />
            </div>
          )}

          {/* ════════════════════════ CONFIGURAÇÕES ════════════════════════ */}
          {tab === "configuracoes" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Configurações</h1>
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Parâmetros gerais da plataforma</p>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                {/* Platform info */}
                <div style={{ ...S.card, padding: "20px 24px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🛍️ Informações da plataforma
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {[
                      { label: "Nome da plataforma", value: "Saubara Meu Market" },
                      { label: "Região atendida",    value: "Saubara — BA" },
                      { label: "Versão",             value: "1.0.0 (demo)" },
                      { label: "Ambiente",           value: "Desenvolvimento" },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#888", marginBottom: "4px" }}>{item.label}</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscription rules */}
                <div style={{ ...S.card, padding: "20px 24px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    💳 Regras de assinatura
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {[
                      { label: "Período gratuito",       value: "30 dias" },
                      { label: "Renovação automática",   value: "Não (manual)" },
                      { label: "Pagamentos online",      value: "Em breve" },
                      { label: "CPF único por loja",     value: "Sim" },
                      { label: "Lojas suspensas visíveis", value: "Não" },
                      { label: "Aprovação de cadastros", value: "Manual (admin)" },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#888", marginBottom: "4px" }}>{item.label}</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin credentials */}
                <div style={{ ...S.card, padding: "20px 24px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🛡️ Acesso administrativo
                  </h3>
                  <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: "#555" }}>
                    <div style={{ marginBottom: "6px" }}><strong>E-mail:</strong> configurado via variável de ambiente</div>
                    <div><strong>URL:</strong> /admin</div>
                  </div>
                  <p style={{ fontSize: "12px", color: "#aaa", margin: "10px 0 0" }}>
                    ⚠️ Credenciais gerenciadas pelo servidor. Não são expostas no frontend.
                  </p>
                </div>

                <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "16px 20px", fontSize: "13px", color: "#888", border: "1.5px dashed #e0e0e0" }}>
                  ℹ️ Configurações avançadas (integrações, pagamentos, notificações) serão adicionadas em versões futuras.
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Note Modal (Reject / Request Correction) ── */}
      {noteModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "18px", padding: "28px", maxWidth: "460px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>
              {noteModal.mode === "reject" ? "❌ Rejeitar cadastro" : "✏️ Solicitar correções"}
            </h3>
            <p style={{ fontSize: "13px", color: "#888", margin: "0 0 16px" }}>
              {noteModal.mode === "reject"
                ? "O comerciante será notificado com o motivo da rejeição."
                : "O cadastro volta para status pendente com a sua mensagem de orientação."}
            </p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={noteModal.mode === "reject"
                ? "Ex: Documentação incompleta. Envie RG e comprovante de endereço."
                : "Ex: Por favor, corrija o nome da loja e adicione o WhatsApp comercial."}
              rows={4}
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "13px", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={submitNoteModal}
                disabled={!noteText.trim()}
                style={{ flex: 1, padding: "12px", background: noteModal.mode === "reject" ? "#e53935" : "#FF8A50", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, cursor: noteText.trim() ? "pointer" : "not-allowed", opacity: noteText.trim() ? 1 : 0.5 }}>
                {noteModal.mode === "reject" ? "Confirmar rejeição" : "Enviar orientação"}
              </button>
              <button onClick={() => setNoteModal({ open: false, mode: "reject", id: "" })}
                style={{ flex: 1, padding: "12px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Photo Verification Modal ── */}
      {verifyOpen && (() => {
        const seller = sellers.find(s => s.id === verifyOpen);
        if (!seller) return null;
        const checks = getChecks(verifyOpen);
        const allChecked = checks.every(Boolean);
        const photos = seller.photos;
        const CHECKLIST = [
          "Identidade do responsável confirmada",
          "Empresa / loja verificada",
          "Fotos analisadas e aprovadas",
        ];

        const PhotoSlot = ({ url, label, required }: { url?: string; label: string; required?: boolean }) => (
          <div style={{ flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              {label}
              {required && <span style={{ color: "#e53935", fontSize: "10px" }}>*</span>}
            </div>
            {url ? (
              <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: "1.5px solid #e0e0e0", aspectRatio: "4/3", background: "#f8f8f8" }}>
                <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(22,163,74,0.9)", color: "white", fontSize: "10px", fontWeight: 700, borderRadius: "6px", padding: "2px 7px" }}>
                  ✓ Enviada
                </div>
              </div>
            ) : (
              <div style={{ borderRadius: "10px", border: "1.5px dashed #d1d5db", aspectRatio: "4/3", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <span style={{ fontSize: "24px" }}>📷</span>
                <span style={{ fontSize: "11px", color: "#aaa" }}>Não enviada</span>
              </div>
            )}
          </div>
        );

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
            <div style={{ background: "white", borderRadius: "20px", maxWidth: "600px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", maxHeight: "90vh", overflowY: "auto" }}>
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a" }}>🖼️ Verificação de fotos</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{seller.storeName} · {seller.name}</div>
                </div>
                <button onClick={() => setVerifyOpen(null)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>

              {/* Photos */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Fotos enviadas pelo comerciante</div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <PhotoSlot url={photos?.photoResponsavel} label="Foto do responsável" required />
                  <PhotoSlot url={photos?.logoLoja} label="Logo da loja" required />
                  <PhotoSlot url={photos?.fotoFachada} label="Fachada / ponto" />
                </div>

                {/* Checklist */}
                <div style={{ marginTop: "22px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Checklist de aprovação</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {CHECKLIST.map((item, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "10px 14px", borderRadius: "10px", background: checks[i] ? "#f0fff4" : "#f9fafb", border: `1.5px solid ${checks[i] ? "#86efac" : "#e5e7eb"}`, transition: "all 0.15s" }}>
                        <input
                          type="checkbox"
                          checked={checks[i]}
                          onChange={() => toggleCheck(verifyOpen, i)}
                          style={{ width: "16px", height: "16px", accentColor: "#22c55e", cursor: "pointer", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: checks[i] ? "#166534" : "#374151" }}>{item}</span>
                        {checks[i] && <span style={{ marginLeft: "auto", fontSize: "14px" }}>✅</span>}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Current status reminder */}
                <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "10px", background: "#f8f9fa", fontSize: "12px", color: "#888", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>📋</span>
                  <span>Status atual: <strong style={{ color: "#1a1a1a" }}>{
                    seller.approvalStatus === "pending" ? "Aguardando aprovação" :
                    seller.approvalStatus === "approved" ? "Aprovado" :
                    seller.approvalStatus === "rejected" ? "Rejeitado" : "Suspenso"
                  }</strong>
                  {seller.approvalNote && <> · <em>"{seller.approvalNote}"</em></>}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {(seller.approvalStatus === "pending" || seller.approvalStatus === "rejected") && (
                  <button
                    onClick={() => { approveSeller(seller.id); setVerifyOpen(null); }}
                    disabled={!allChecked}
                    style={{ flex: 1, padding: "11px", background: allChecked ? "#22c55e" : "#d1fae5", color: allChecked ? "white" : "#6b7280", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: allChecked ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                    ✓ Aprovar cadastro
                  </button>
                )}
                {(seller.approvalStatus === "pending" || seller.approvalStatus === "rejected") && (
                  <button
                    onClick={() => { setVerifyOpen(null); openNoteModal("reject", seller.id); }}
                    style={{ flex: 1, padding: "11px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                    ✗ Rejeitar
                  </button>
                )}
                {seller.approvalStatus === "pending" && (
                  <button
                    onClick={() => { setVerifyOpen(null); openNoteModal("correction", seller.id); }}
                    style={{ flex: 1, padding: "11px", background: "#fef3c7", color: "#92400e", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                    ✏️ Pedir correção
                  </button>
                )}
                {seller.approvalStatus === "approved" && !seller.suspended && (
                  <button
                    onClick={() => { suspendSeller(seller.id); setVerifyOpen(null); }}
                    style={{ flex: 1, padding: "11px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                    ⛔ Suspender
                  </button>
                )}
                <button onClick={() => setVerifyOpen(null)} style={{ padding: "11px 20px", background: "#f5f5f5", color: "#555", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  Fechar
                </button>
              </div>

              {!allChecked && (seller.approvalStatus === "pending" || seller.approvalStatus === "rejected") && (
                <div style={{ padding: "0 24px 16px", fontSize: "11px", color: "#f59e0b", display: "flex", gap: "6px", alignItems: "center" }}>
                  ⚠️ Marque todos os itens do checklist para liberar a aprovação.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardInner />
    </AdminErrorBoundary>
  );
}
