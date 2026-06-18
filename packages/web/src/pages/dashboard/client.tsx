import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth, LOCALIDADES, Localidade, UserAddress } from "../../lib/auth";
import { useFavorites } from "../../lib/favorites";
import { resolveStores } from "../../lib/store-resolver";
import { useOrders, ORDER_STATUS_LABEL } from "../../lib/orders";
import { useNotifications } from "../../lib/notifications";
import { uploadImageWithFallback } from "../../lib/upload";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "perfil" | "pedidos" | "favoritos-lojas" | "favoritos-produtos" | "atividades";

// Favorites are now loaded from useFavorites() context (real localStorage)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const [, navigate] = useLocation();
  const { user, logout, updateUser } = useAuth();
  const [tab, setTab] = useState<Tab>("perfil");
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    localidade: (user?.address?.localidade || "") as Localidade | "",
    rua: user?.address?.rua || "",
    numero: user?.address?.numero || "",
    complemento: user?.address?.complemento || "",
    referencia: user?.address?.referencia || "",
  });

  const { favStoreIds, favProducts: favProductsList, toggleStore, toggleProduct } = useFavorites();
  const { orders: realOrders, getByClient } = useOrders();
  const { notifications, unreadCount, markRead, markAllRead, remove: removeNotif } = useNotifications();

  if (!user) { navigate("/auth/login"); return null; }

  const avatar = avatarPreview || user.avatar;
  const localidadeLabel = LOCALIDADES.find((l) => l.value === user.address?.localidade)?.label;
  const clientOrders = getByClient(user.id);
  const totalOrders = clientOrders.length;
  const totalSpent = clientOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadImageWithFallback(file, "avatar");
      setAvatarPreview(url);
      updateUser({ avatar: url });
    } catch (err) {
      console.error("[AVATAR] Upload falhou:", err);
    }
  };

  const handleSave = () => {
    const address: UserAddress | undefined = editForm.localidade
      ? { localidade: editForm.localidade as Localidade, rua: editForm.rua || undefined,
          numero: editForm.numero || undefined, complemento: editForm.complemento || undefined,
          referencia: editForm.referencia || undefined }
      : undefined;
    updateUser({ name: editForm.name, phone: editForm.phone, address });
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const favStoreData = resolveStores().filter((s) => favStoreIds.includes(s.id));
  const favProductData = favProductsList;

  const navTabs: { key: Tab; label: string; icon: string }[] = [
    { key: "perfil", label: "Perfil", icon: "👤" },
    { key: "pedidos", label: "Pedidos", icon: "📦" },
    { key: "favoritos-lojas", label: "Lojas", icon: "🏪" },
    { key: "favoritos-produtos", label: "Produtos", icon: "❤️" },
    { key: "atividades", label: "Histórico", icon: "📋" },
  ];

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", minHeight: "100vh", background: "#f2f4f7" }}>
      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #0B7A6E, #0F9D8A)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "58px" }}>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderRadius: "20px" }}>
            <span style={{ color: "white", fontSize: "15px" }}>←</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>Marketplace</span>
          </button>
          <span style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>Minha Conta</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.6)" }} />
              : <div style={{ width: "34px", height: "34px", background: "rgba(255,255,255,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "white" }}>
                  {getInitials(user.name)}
                </div>
            }
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 16px 40px" }}>

        {/* ── Hero Card ── */}
        <div style={{ background: "linear-gradient(135deg, #0F9D8A 0%, #0B7A6E 100%)", borderRadius: "0 0 24px 24px", padding: "28px 24px 24px", marginBottom: "20px", position: "relative", overflow: "hidden" }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", background: "rgba(255,255,255,0.07)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: "-30px", right: "60px", width: "80px", height: "80px", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", position: "relative" }}>
            {/* Avatar with upload */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {avatar
                ? <img src={avatar} alt="perfil" style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.9)" }} />
                : <div style={{ width: "72px", height: "72px", background: "rgba(255,255,255,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 700, color: "white", border: "3px solid rgba(255,255,255,0.5)" }}>
                    {getInitials(user.name)}
                  </div>
              }
              <button onClick={() => fileRef.current?.click()}
                style={{ position: "absolute", bottom: "0", right: "0", width: "24px", height: "24px", background: "white", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                📷
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <h2 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</h2>
                <span style={{ background: "rgba(255,255,255,0.25)", color: "white", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", flexShrink: 0 }}>CLIENTE</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", marginBottom: "2px" }}>{user.email}</div>
              {localidadeLabel && (
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>📍 {localidadeLabel}</div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "20px" }}>
            {[
              { label: "Pedidos", value: totalOrders },
              { label: "Lojas favoritas", value: favStoreIds.length },
              { label: "Gasto total", value: `R$ ${totalSpent.toFixed(2).replace(".", ",")}` },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "10px 8px", textAlign: "center" }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: stat.label === "Gasto total" ? "13px" : "18px" }}>{stat.value}</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "10px", marginTop: "2px" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Nav Tabs ── */}
        <div style={{ display: "flex", background: "white", borderRadius: "14px", padding: "4px", marginBottom: "16px", gap: "2px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflowX: "auto" }}>
          {navTabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: "1 0 auto", padding: "9px 6px", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap",
                background: tab === t.key ? "#0F9D8A" : "transparent",
                color: tab === t.key ? "white" : "#888" }}>
              <div style={{ fontSize: "16px", marginBottom: "2px" }}>{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: PERFIL
        ══════════════════════════════════════════ */}
        {tab === "perfil" && (
          <div>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Informações pessoais</h3>
                {saved && <span style={{ color: "#0F9D8A", fontSize: "12px", fontWeight: 700, background: "#e8f8f5", padding: "3px 10px", borderRadius: "20px" }}>✓ Salvo!</span>}
              </div>

              {editMode ? (
                <div>
                  {/* Name & Phone */}
                  {[
                    { label: "Nome completo", key: "name" as const, type: "text", placeholder: "Seu nome completo" },
                    { label: "Telefone / WhatsApp", key: "phone" as const, type: "tel", placeholder: "(71) 99999-9999" },
                  ].map((f) => (
                    <div key={f.key} style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</label>
                      <input type={f.type} value={editForm[f.key]} placeholder={f.placeholder}
                        onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                        style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s" }}
                        onFocus={(e) => (e.target.style.borderColor = "#0F9D8A")}
                        onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
                    </div>
                  ))}

                  {/* Address */}
                  <div style={{ background: "#f8fffe", border: "1.5px solid #d0f0ec", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0B7A6E", marginBottom: "12px" }}>📍 Endereço em Saubara</div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Localidade</label>
                      <select value={editForm.localidade} onChange={(e) => setEditForm({ ...editForm, localidade: e.target.value as Localidade | "" })}
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d0f0ec", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "white", cursor: "pointer" }}>
                        <option value="">Selecione</option>
                        {LOCALIDADES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Rua / Logradouro</label>
                      <input type="text" value={editForm.rua} onChange={(e) => setEditForm({ ...editForm, rua: e.target.value })} placeholder="Rua das Flores"
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d0f0ec", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px", marginBottom: "10px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Número</label>
                        <input type="text" value={editForm.numero} onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })} placeholder="S/N"
                          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d0f0ec", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Complemento</label>
                        <input type="text" value={editForm.complemento} onChange={(e) => setEditForm({ ...editForm, complemento: e.target.value })} placeholder="Apto, casa..."
                          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d0f0ec", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Ponto de referência</label>
                      <input type="text" value={editForm.referencia} onChange={(e) => setEditForm({ ...editForm, referencia: e.target.value })} placeholder="Próximo à Igreja Matriz"
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #d0f0ec", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={handleSave} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #0F9D8A, #0B7A6E)", color: "white", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
                      ✓ Salvar alterações
                    </button>
                    <button onClick={() => setEditMode(false)} style={{ padding: "12px 18px", background: "#f5f5f5", color: "#666", border: "none", borderRadius: "12px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Info rows */}
                  {[
                    { icon: "✉️", label: "E-mail", value: user.email },
                    { icon: "📱", label: "Telefone", value: user.phone || "Não informado" },
                    { icon: "🪪", label: "CPF", value: user.cpf ? `***.***.${user.cpf.slice(-5, -2)}-${user.cpf.slice(-2)}` : "Não informado" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <span style={{ fontSize: "20px", width: "24px", textAlign: "center" }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: "11px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
                        <div style={{ fontSize: "14px", color: "#333", fontWeight: 500, marginTop: "1px" }}>{item.value}</div>
                      </div>
                    </div>
                  ))}

                  {/* Address */}
                  {user.address ? (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <span style={{ fontSize: "20px", width: "24px", textAlign: "center", marginTop: "2px" }}>📍</span>
                      <div>
                        <div style={{ fontSize: "11px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px" }}>Endereço</div>
                        <div style={{ fontSize: "14px", color: "#333", fontWeight: 500, marginTop: "1px" }}>
                          {LOCALIDADES.find(l => l.value === user.address?.localidade)?.label || user.address.localidade}
                        </div>
                        {(user.address.rua || user.address.numero) && (
                          <div style={{ fontSize: "12px", color: "#777", marginTop: "2px" }}>
                            {[user.address.rua, user.address.numero].filter(Boolean).join(", ")}
                            {user.address.complemento ? ` · ${user.address.complemento}` : ""}
                          </div>
                        )}
                        {user.address.referencia && (
                          <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>Ref: {user.address.referencia}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                      <span style={{ fontSize: "20px", width: "24px", textAlign: "center" }}>📍</span>
                      <div>
                        <div style={{ fontSize: "11px", color: "#aaa", textTransform: "uppercase" }}>Endereço</div>
                        <div style={{ fontSize: "13px", color: "#bbb", marginTop: "1px" }}>Não informado</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                    <button onClick={() => { setEditForm({ name: user.name, phone: user.phone || "", localidade: (user.address?.localidade || "") as Localidade | "", rua: user.address?.rua || "", numero: user.address?.numero || "", complemento: user.address?.complemento || "", referencia: user.address?.referencia || "" }); setEditMode(true); }}
                      style={{ flex: 1, padding: "11px", background: "#f0faf9", color: "#0F9D8A", border: "1.5px solid #0F9D8A", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                      ✏️ Editar dados
                    </button>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ padding: "11px 14px", background: "#f5f5f5", color: "#555", border: "1.5px solid #e0e0e0", borderRadius: "12px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                      📷
                    </button>
                    <button onClick={() => { logout(); navigate("/"); }}
                      style={{ padding: "11px 14px", background: "#fff0f0", color: "#e53935", border: "1.5px solid #ffcdd2", borderRadius: "12px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account info card */}
            <div style={{ background: "white", borderRadius: "16px", padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#333", marginBottom: "12px" }}>Sobre a conta</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { icon: "📅", label: "Membro desde", value: "Jun 2026" },
                  { icon: "🌟", label: "Status", value: "Ativo" },
                  { icon: "📦", label: "Total de pedidos", value: `${totalOrders} pedidos` },
                  { icon: "❤️", label: "Favoritos", value: `${favStoreIds.length} lojas · ${favProductsList.length} produtos` },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#f8f9fa", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "16px", marginBottom: "4px" }}>{item.icon}</div>
                    <div style={{ fontSize: "10px", color: "#aaa", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "#333", fontWeight: 600, marginTop: "2px" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: PEDIDOS
        ══════════════════════════════════════════ */}
        {tab === "pedidos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Meus Pedidos</h3>
              <span style={{ background: "#0F9D8A", color: "white", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" }}>{totalOrders}</span>
            </div>

            {clientOrders.length === 0 ? (
              <EmptyState icon="📦" title="Nenhum pedido ainda" subtitle="Seus pedidos aparecerão aqui após finalizar a compra" cta="Explorar lojas" onCta={() => navigate("/")} />
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {clientOrders.map((order) => {
                  const statusColors: Record<string, { bg: string; color: string }> = {
                    pending:      { bg: "#fff8e1", color: "#f57f17" },
                    confirmed:    { bg: "#e3f2fd", color: "#1565c0" },
                    preparing:    { bg: "#fff3e0", color: "#e65100" },
                    out_delivery: { bg: "#ede7f6", color: "#4527a0" },
                    delivered:    { bg: "#e8f5e9", color: "#2e7d32" },
                    cancelled:    { bg: "#ffebee", color: "#c62828" },
                  };
                  const sc = statusColors[order.status] || statusColors.pending;
                  return (
                    <div key={order.id} style={{ background: "white", borderRadius: "14px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: `1.5px solid ${sc.bg}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: "10px" }}>
                          <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "14px", marginBottom: "3px" }}>
                            {order.items.map(i => `${i.productName} ×${i.quantity}`).join(", ")}
                          </div>
                          <div style={{ color: "#888", fontSize: "12px" }}>🏪 {order.storeName}</div>
                        </div>
                        <div style={{ background: sc.bg, color: sc.color, fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid #f5f5f5" }}>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
                          <span style={{ fontSize: "11px", color: "#bbb" }}>{order.id.slice(0, 12)}…</span>
                          <span style={{ fontSize: "11px", color: "#bbb" }}>📅 {new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
                          <span style={{ fontSize: "11px", color: "#bbb" }}>📦 {order.items.length} item(s)</span>
                        </div>
                        <div style={{ fontWeight: 700, color: "#0F9D8A", fontSize: "15px" }}>R$ {order.total.toFixed(2).replace(".", ",")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            <div style={{ background: "white", borderRadius: "14px", padding: "14px 18px", marginTop: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#666" }}>Total gasto</span>
              <span style={{ fontWeight: 700, color: "#0F9D8A", fontSize: "16px" }}>R$ {totalSpent.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: LOJAS FAVORITAS
        ══════════════════════════════════════════ */}
        {tab === "favoritos-lojas" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Lojas Favoritas</h3>
              <span style={{ background: "#e91e63", color: "white", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" }}>{favStoreData.length}</span>
            </div>

            {favStoreData.length === 0 ? (
              <EmptyState icon="🏪" title="Nenhuma loja favoritada" subtitle="Explore o marketplace e favorite as lojas que você curte" cta="Ver lojas" onCta={() => navigate("/")} />
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {favStoreData.map((store) => (
                  <div key={store.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center" }}>
                    <img src={store.imageUrl} alt={store.name} style={{ width: "70px", height: "70px", objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "14px", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.name}</div>
                      <div style={{ color: "#888", fontSize: "12px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.description}</div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ background: "#fff8e1", color: "#FF8A50", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>⭐ {store.rating}</span>
                        <span style={{ color: "#bbb", fontSize: "11px" }}>{store.neighborhood}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "12px 12px 12px 0" }}>
                      <button onClick={() => navigate(`/store/${store.id}`)}
                        style={{ background: "#0F9D8A", color: "white", border: "none", borderRadius: "8px", padding: "7px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                        Ver loja
                      </button>
                      <button onClick={() => toggleStore(store.id)}
                        style={{ background: "#fff0f5", color: "#e91e63", border: "none", borderRadius: "8px", padding: "7px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        ❤️ Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Discover more */}
            <button onClick={() => navigate("/")} style={{ width: "100%", marginTop: "14px", padding: "13px", background: "white", border: "1.5px dashed #0F9D8A", borderRadius: "14px", color: "#0F9D8A", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
              + Descobrir mais lojas
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: PRODUTOS FAVORITOS
        ══════════════════════════════════════════ */}
        {tab === "favoritos-produtos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Produtos Favoritos</h3>
              <span style={{ background: "#e91e63", color: "white", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px" }}>{favProductData.length}</span>
            </div>

            {favProductData.length === 0 ? (
              <EmptyState icon="❤️" title="Nenhum produto favoritado" subtitle="Explore as lojas e salve os produtos que você quer comprar" cta="Explorar" onCta={() => navigate("/")} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {favProductData.map((product) => {
                  const store = resolveStores().find((s) => s.id === product.storeId);
                  return (
                    <div key={product.id} style={{ background: "white", borderRadius: "14px", padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative" }}>
                      <button onClick={() => toggleProduct({ id: product.id, storeId: product.storeId, name: product.name, price: product.price, imageUrl: product.imageUrl, storeName: product.storeName })}
                        style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>
                        ❤️
                      </button>
                      <div style={{ marginBottom: "10px", background: "#f8f9fa", borderRadius: "10px", overflow: "hidden", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {product.imageUrl
                          ? <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: "36px" }}>🛍️</span>
                        }
                      </div>
                      <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "13px", marginBottom: "4px", lineHeight: "1.3" }}>{product.name}</div>
                      <div style={{ color: "#aaa", fontSize: "11px", marginBottom: "8px" }}>{store?.name || "Loja"}</div>
                      <div style={{ color: "#0F9D8A", fontWeight: 800, fontSize: "15px", marginBottom: "10px" }}>
                        R$ {product.price.toFixed(2).replace(".", ",")}
                      </div>
                      <button onClick={() => store && navigate(`/store/${store.id}`)}
                        style={{ width: "100%", padding: "8px", background: "#f0faf9", color: "#0F9D8A", border: "1.5px solid #0F9D8A", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                        Ver na loja
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => navigate("/")} style={{ width: "100%", marginTop: "14px", padding: "13px", background: "white", border: "1.5px dashed #0F9D8A", borderRadius: "14px", color: "#0F9D8A", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
              + Descobrir mais produtos
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: HISTÓRICO DE ATIVIDADES (real notifications)
        ══════════════════════════════════════════ */}
        {tab === "atividades" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                Notificações
                {unreadCount > 0 && (
                  <span style={{ marginLeft: "8px", background: "#e53935", color: "white", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "10px" }}>
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  style={{ background: "none", border: "none", color: "#0F9D8A", fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: "4px 10px", borderRadius: "8px" }}>
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <EmptyState
                icon="🔔"
                title="Nenhuma notificação"
                subtitle="Suas notificações de pedidos e atualizações aparecerão aqui"
                cta="Explorar lojas"
                onCta={() => navigate("/")}
              />
            ) : (
              <div style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {notifications.map((notif, i) => {
                  const typeIcon: Record<string, string> = {
                    new_order: "🛒",
                    order_update: "📦",
                    system: "⚙️",
                    promo: "🎉",
                  };
                  const typeColor: Record<string, string> = {
                    new_order: "#0F9D8A",
                    order_update: "#1E88E5",
                    system: "#8e24aa",
                    promo: "#FF8A50",
                  };
                  const icon = typeIcon[notif.type] || "🔔";
                  const color = typeColor[notif.type] || "#888";
                  const isLast = i === notifications.length - 1;

                  return (
                    <div key={notif.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "14px",
                        padding: "14px 18px",
                        borderBottom: isLast ? "none" : "1px solid #f5f5f5",
                        background: notif.read ? "white" : "#f0faf9",
                        position: "relative",
                        transition: "background 0.2s",
                      }}>
                      {/* Unread dot */}
                      {!notif.read && (
                        <div style={{ position: "absolute", top: "18px", left: "6px", width: "6px", height: "6px", background: "#0F9D8A", borderRadius: "50%" }} />
                      )}
                      {/* Icon */}
                      <div style={{ width: "38px", height: "38px", background: color + "18", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flexShrink: 0, border: `2px solid ${color}28` }}>
                        {icon}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: notif.read ? 500 : 700, color: "#1a1a1a", lineHeight: "1.4", marginBottom: "2px" }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.4", marginBottom: "4px" }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: "11px", color: "#bbb" }}>
                          {new Date(notif.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                        {!notif.read && (
                          <button onClick={() => markRead(notif.id)}
                            style={{ background: "#e8f8f5", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#0F9D8A", cursor: "pointer" }}>
                            ✓ Lida
                          </button>
                        )}
                        <button onClick={() => removeNotif(notif.id)}
                          style={{ background: "#fff0f0", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#e53935", cursor: "pointer" }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Clear all button if there are read notifications */}
            {notifications.length > 0 && (
              <button
                onClick={() => { notifications.forEach(n => removeNotif(n.id)); }}
                style={{ width: "100%", marginTop: "12px", padding: "11px", background: "white", border: "1.5px solid #ffcdd2", borderRadius: "12px", color: "#e53935", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}>
                🗑 Limpar todas as notificações
              </button>
            )}
          </div>
        )}

        {/* ── Support CTA (always visible) ── */}
        <div style={{ marginTop: "24px", background: "linear-gradient(135deg, #1565C0, #0D47A1)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px" }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "14px", marginBottom: "4px" }}>Precisa de ajuda?</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>Abra um chamado na Central de Atendimento</div>
          </div>
          <button onClick={() => navigate("/suporte")} style={{ background: "white", color: "#1565C0", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: 700, fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            🎧 Atendimento
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Empty State Component ────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle, cta, onCta }: {
  icon: string; title: string; subtitle: string; cta: string; onCta: () => void;
}) {
  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "48px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: "52px", marginBottom: "14px" }}>{icon}</div>
      <h3 style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "16px", marginBottom: "8px" }}>{title}</h3>
      <p style={{ color: "#999", fontSize: "13px", marginBottom: "20px", lineHeight: "1.5" }}>{subtitle}</p>
      <button onClick={onCta} style={{ background: "linear-gradient(135deg, #0F9D8A, #0B7A6E)", color: "white", border: "none", borderRadius: "12px", padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
        {cta}
      </button>
    </div>
  );
}
