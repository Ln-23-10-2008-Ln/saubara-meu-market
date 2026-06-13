import { useState, useEffect } from "react";
import {
  getAllTickets, updateTicketStatus, addResponse, deleteTicket, getTicketStats,
  seedDemoTickets,
  CATEGORY_META, STATUS_META,
  type Ticket, type TicketStatus, type TicketCategory,
} from "../../lib/support";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminSupport() {
  const [tickets, setTickets]           = useState<Ticket[]>([]);
  const [stats, setStats]               = useState(getTicketStats());
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");
  const [filterCat, setFilterCat]       = useState<TicketCategory | "all">("all");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<Ticket | null>(null);
  const [replyText, setReplyText]       = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const reload = () => {
    setTickets(getAllTickets());
    setStats(getTicketStats());
  };

  useEffect(() => {
    seedDemoTickets(); // seeds only if localStorage is empty
    reload();
  }, []);

  const filtered = tickets.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCat !== "all" && t.category !== filterCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.id.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q) &&
          !t.subject.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleStatus = (id: string, status: TicketStatus) => {
    updateTicketStatus(id, status);
    reload();
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null);
  };

  const handleReply = () => {
    if (!selected || !replyText.trim()) return;
    addResponse(selected.id, { from: "admin", authorName: "Equipe Saubara Meu Market", message: replyText.trim() });
    setReplyText("");
    reload();
    // refresh selected
    const updated = getAllTickets().find((t) => t.id === selected.id);
    if (updated) setSelected(updated);
  };

  const handleDelete = (id: string) => {
    deleteTicket(id);
    reload();
    if (selected?.id === id) setSelected(null);
    setConfirmDelete(null);
  };

  const S = {
    card: { background: "white", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", marginBottom: "10px" } as React.CSSProperties,
    badge: (color: string, bg: string): React.CSSProperties => ({ background: bg, color, fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "10px", whiteSpace: "nowrap" as const }),
  };

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginBottom: "18px" }}>
        {[
          { label: "Total", value: stats.total, color: "#333", bg: "#f5f5f5" },
          { label: "Abertos", value: stats.aberto, color: STATUS_META.aberto.color, bg: STATUS_META.aberto.bg },
          { label: "Em análise", value: stats.em_analise, color: STATUS_META.em_analise.color, bg: STATUS_META.em_analise.bg },
          { label: "Respondidos", value: stats.respondido, color: STATUS_META.respondido.color, bg: STATUS_META.respondido.bg },
          { label: "Encerrados", value: stats.encerrado, color: STATUS_META.encerrado.color, bg: STATUS_META.encerrado.bg },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "12px 10px", textAlign: "center", cursor: "pointer", border: filterStatus === s.label.toLowerCase().replace(" ", "_") ? `2px solid ${s.color}` : "2px solid transparent" }}
            onClick={() => setFilterStatus(s.label === "Total" ? "all" : s.label.toLowerCase().replace(" ", "_") as TicketStatus)}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Category + satisfaction row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: "8px", marginBottom: "18px" }}>
        {(Object.entries(CATEGORY_META) as [TicketCategory, typeof CATEGORY_META[TicketCategory]][]).map(([key, meta]) => (
          <div key={key} style={{ background: meta.bg, borderRadius: "10px", padding: "10px 8px", textAlign: "center", cursor: "pointer", border: filterCat === key ? `2px solid ${meta.color}` : "2px solid transparent" }}
            onClick={() => setFilterCat(filterCat === key ? "all" : key)}>
            <div style={{ fontSize: "18px" }}>{meta.icon}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: meta.color }}>{(stats as Record<string, number | string>)[key]}</div>
            <div style={{ fontSize: "9px", color: "#888" }}>{meta.label}</div>
          </div>
        ))}
        <div style={{ background: "#fff8e1", borderRadius: "10px", padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: "18px" }}>⭐</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#F57C00" }}>{stats.avgRating}</div>
          <div style={{ fontSize: "9px", color: "#888" }}>Avaliação</div>
        </div>
      </div>

      {/* ── Main layout (list + detail) ── */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.3fr" : "1fr", gap: "14px" }}>

        {/* ── Ticket list ── */}
        <div>
          {/* Search + filters */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input type="text" placeholder="🔍 Buscar por protocolo, nome, e-mail..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "13px", outline: "none", fontFamily: "inherit" }} />
            <button onClick={reload} style={{ background: "#f0f0f0", border: "none", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontSize: "13px" }}>↻</button>
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
            {([["all", "Todos", "#666", "#f0f0f0"], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label, v.color, v.bg])] as [string, string, string, string][]).map(([key, label, color, bg]) => (
              <button key={key} onClick={() => setFilterStatus(key as TicketStatus | "all")}
                style={{ padding: "5px 12px", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: filterStatus === key ? color : bg, color: filterStatus === key ? "white" : color, transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#bbb", padding: "40px", background: "white", borderRadius: "14px" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📭</div>
              <div style={{ fontSize: "14px" }}>Nenhum atendimento encontrado</div>
            </div>
          ) : (
            <div style={{ maxHeight: "520px", overflowY: "auto" }}>
              {filtered.map((t) => {
                const cat    = CATEGORY_META[t.category];
                const status = STATUS_META[t.status];
                const isNew  = t.status === "aberto";
                return (
                  <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
                    style={{ ...S.card, cursor: "pointer", borderLeft: `4px solid ${selected?.id === t.id ? "#1565C0" : isNew ? cat.color : "#e0e0e0"}`, background: selected?.id === t.id ? "#f0f7ff" : "white" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span style={{ background: cat.bg, borderRadius: "8px", padding: "5px 7px", fontSize: "16px", flexShrink: 0 }}>{cat.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "3px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                          <span style={S.badge(status.color, status.bg)}>{status.label}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#888" }}>{t.name} · {t.email}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "5px" }}>
                          <span style={{ fontSize: "10px", color: "#aaa", fontFamily: "monospace" }}>{t.id}</span>
                          <span style={{ fontSize: "10px", color: "#bbb" }}>{timeAgo(t.updatedAt)} {t.responses.length > 0 ? `· ${t.responses.length} resp.` : ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Ticket detail ── */}
        {selected && (
          <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", maxHeight: "640px", overflowY: "auto", position: "relative" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "20px" }}>{CATEGORY_META[selected.category].icon}</span>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>{selected.subject}</span>
                </div>
                <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#888" }}>{selected.id}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "#f5f5f5", border: "none", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "13px", color: "#666" }}>✕ Fechar</button>
            </div>

            {/* Requester info */}
            <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Nome", value: selected.name },
                  { label: "E-mail", value: selected.email },
                  { label: "Telefone", value: selected.phone || "Não informado" },
                  { label: "Aberto em", value: fmtDate(selected.createdAt) },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: "9px", color: "#aaa", textTransform: "uppercase", marginBottom: "2px" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {selected.rating && (
                <div style={{ marginTop: "8px", borderTop: "1px solid #e0e0e0", paddingTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#888" }}>Avaliação do atendimento: </span>
                  {"⭐".repeat(selected.rating)} <span style={{ fontSize: "11px", color: "#F57C00", fontWeight: 700 }}>{selected.rating}/5</span>
                </div>
              )}
            </div>

            {/* Status controls */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", marginBottom: "6px" }}>Alterar status:</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {(Object.entries(STATUS_META) as [TicketStatus, typeof STATUS_META[TicketStatus]][]).map(([key, meta]) => (
                  <button key={key} onClick={() => handleStatus(selected.id, key)}
                    style={{ padding: "6px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: 600,
                      background: selected.status === key ? meta.color : meta.bg,
                      color: selected.status === key ? "white" : meta.color, transition: "all 0.15s" }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Original message */}
            <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", borderLeft: "3px solid #e0e0e0" }}>
              <div style={{ fontSize: "10px", color: "#aaa", marginBottom: "6px" }}>Mensagem original:</div>
              <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{selected.message}</div>
            </div>

            {/* Thread */}
            {selected.responses.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", marginBottom: "8px" }}>Histórico ({selected.responses.length}):</div>
                {selected.responses.map((r) => (
                  <div key={r.id} style={{ background: r.from === "admin" ? "#e3f2fd" : "#f0faf9", borderRadius: "10px", padding: "10px 12px", marginBottom: "6px", borderLeft: `3px solid ${r.from === "admin" ? "#1565C0" : "#0F9D8A"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: r.from === "admin" ? "#1565C0" : "#0F9D8A" }}>{r.authorName}</span>
                      <span style={{ fontSize: "10px", color: "#aaa" }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{r.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            {selected.status !== "encerrado" && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#555", textTransform: "uppercase", marginBottom: "6px" }}>Responder:</div>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3}
                  placeholder="Digite sua resposta para o usuário..."
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", transition: "border-color 0.2s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button onClick={handleReply} disabled={!replyText.trim()}
                    style={{ flex: 1, padding: "10px", background: replyText.trim() ? "linear-gradient(135deg, #1565C0, #0D47A1)" : "#e0e0e0", color: replyText.trim() ? "white" : "#aaa", border: "none", borderRadius: "10px", fontWeight: 700, cursor: replyText.trim() ? "pointer" : "not-allowed", fontSize: "13px" }}>
                    📨 Enviar resposta
                  </button>
                  <button onClick={() => handleStatus(selected.id, "encerrado")}
                    style={{ padding: "10px 14px", background: "#f5f5f5", color: "#666", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}>
                    ✓ Encerrar
                  </button>
                </div>
              </div>
            )}

            {/* Delete */}
            {confirmDelete === selected.id ? (
              <div style={{ background: "#fdecea", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#c62828", marginBottom: "10px" }}>Tem certeza? Esta ação não pode ser desfeita.</div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <button onClick={() => handleDelete(selected.id)} style={{ padding: "8px 18px", background: "#e53935", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}>Excluir</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 18px", background: "#f5f5f5", color: "#666", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(selected.id)} style={{ width: "100%", padding: "8px", background: "none", border: "1.5px solid #ffcdd2", borderRadius: "10px", color: "#e53935", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}>
                🗑️ Excluir atendimento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
