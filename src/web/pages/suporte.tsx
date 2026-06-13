import { useState } from "react";
import { useLocation } from "wouter";
import { smartBack } from "../lib/navigation";
import {
  createTicket, getTicketsByEmail,
  CATEGORY_META, STATUS_META,
  type TicketCategory, type Ticket,
} from "../lib/support";



// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<"home" | "form" | "success">("home");
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Form state
  const [form, setForm] = useState({ subject: "", message: "", name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Track state
  const [trackEmail, setTrackEmail] = useState("");
  const [trackTickets, setTrackTickets] = useState<Ticket[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name    = "Nome é obrigatório";
    if (!form.email.trim())   e.email   = "E-mail é obrigatório";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.subject.trim()) e.subject = "Assunto é obrigatório";
    if (!form.message.trim() || form.message.trim().length < 20)
      e.message = "Descreva com ao menos 20 caracteres";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    setTimeout(() => {
      const ticket = createTicket({
        category: selectedCategory!,
        subject:  form.subject,
        message:  form.message,
        name:     form.name,
        email:    form.email,
        phone:    form.phone || undefined,
      });
      setCreatedTicket(ticket);
      setView("success");
      setSubmitting(false);
    }, 800);
  };

  const handleTrack = () => {
    if (!trackEmail.trim()) return;
    const tickets = getTicketsByEmail(trackEmail.trim());
    setTrackTickets(tickets);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e0e0e0",
    borderRadius: "10px", fontSize: "14px", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit", background: "white",
    transition: "border-color 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, color: "#555",
    marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", minHeight: "100vh", background: "#f2f4f7" }}>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg, #1565C0, #0D47A1)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "58px" }}>
          <button onClick={() => smartBack(navigate)} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderRadius: "20px" }}>
            <span style={{ color: "white", fontSize: "15px" }}>←</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>Marketplace</span>
          </button>
          <span style={{ color: "white", fontWeight: 700, fontSize: "15px" }}>Central de Atendimento</span>
          <div style={{ width: "90px" }} />
        </div>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 16px 60px" }}>

        {/* ══════════════════════════════════════════
            VIEW: HOME
        ══════════════════════════════════════════ */}
        {view === "home" && (
          <div>
            {/* Hero */}
            <div style={{ background: "linear-gradient(135deg, #1565C0, #0D47A1)", borderRadius: "0 0 24px 24px", padding: "32px 24px 28px", marginBottom: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎯</div>
              <h1 style={{ color: "white", fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>Como podemos ajudar?</h1>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
                Envie sua mensagem e receba um protocolo.<br />Nossa equipe responde em até 48h úteis.
              </p>
            </div>

            {/* Category picker */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#333", marginBottom: "12px", textAlign: "center" }}>Selecione o tipo de atendimento</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {(Object.entries(CATEGORY_META) as [TicketCategory, typeof CATEGORY_META[TicketCategory]][]).map(([key, meta]) => (
                  <button key={key} onClick={() => { setSelectedCategory(key); setView("form"); }}
                    style={{ background: "white", border: `2px solid ${meta.bg}`, borderRadius: "16px", padding: "20px 14px", cursor: "pointer", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = meta.color; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = meta.bg; }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>{meta.icon}</div>
                    <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "14px", marginBottom: "4px" }}>{meta.label}</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>
                      {key === "reclamacao" && "Problemas com compra ou loja"}
                      {key === "sugestao"   && "Ideias para melhorar o app"}
                      {key === "denuncia"   && "Irregularidades ou fraudes"}
                      {key === "duvida"     && "Perguntas gerais"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Track existing ticket */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#333", margin: "0 0 4px" }}>🔍 Acompanhar protocolo</h3>
              <p style={{ fontSize: "12px", color: "#aaa", margin: "0 0 14px" }}>Use o e-mail que usou para abrir o chamado</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="email" placeholder="seu@email.com" value={trackEmail} onChange={(e) => setTrackEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
                <button onClick={handleTrack}
                  style={{ background: "#1565C0", color: "white", border: "none", borderRadius: "10px", padding: "12px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Buscar
                </button>
              </div>

              {trackTickets !== null && (
                <div style={{ marginTop: "14px" }}>
                  {trackTickets.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#aaa", fontSize: "13px", padding: "20px" }}>Nenhum protocolo encontrado para este e-mail.</div>
                  ) : (
                    <div style={{ display: "grid", gap: "8px" }}>
                      {trackTickets.map((t) => {
                        const cat    = CATEGORY_META[t.category];
                        const status = STATUS_META[t.status];
                        const isOpen = expandedId === t.id;
                        return (
                          <div key={t.id} style={{ border: `1.5px solid ${isOpen ? "#1565C0" : "#f0f0f0"}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.2s" }}>
                            <button onClick={() => setExpandedId(isOpen ? null : t.id)}
                              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                              <span style={{ background: cat.bg, borderRadius: "8px", padding: "5px 7px", fontSize: "16px", flexShrink: 0 }}>{cat.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>Protocolo: {t.id} · {fmtDate(t.createdAt)}</div>
                              </div>
                              <span style={{ background: status.bg, color: status.color, fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "10px", flexShrink: 0 }}>{status.label}</span>
                            </button>

                            {isOpen && (
                              <div style={{ borderTop: "1px solid #f0f0f0", padding: "14px 14px 16px" }}>
                                <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                                  <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Sua mensagem:</div>
                                  <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.5" }}>{t.message}</div>
                                </div>
                                {t.responses.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "8px" }}>Respostas:</div>
                                    {t.responses.map((r) => (
                                      <div key={r.id} style={{ background: r.from === "admin" ? "#e3f2fd" : "#f8f9fa", borderRadius: "10px", padding: "10px 12px", marginBottom: "6px", borderLeft: `3px solid ${r.from === "admin" ? "#1565C0" : "#bbb"}` }}>
                                        <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{r.authorName} · {fmtDate(r.createdAt)}</div>
                                        <div style={{ fontSize: "13px", color: "#333", lineHeight: "1.5" }}>{r.message}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {t.responses.length === 0 && (
                                  <div style={{ textAlign: "center", color: "#bbb", fontSize: "12px", padding: "8px" }}>Aguardando resposta da equipe...</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: FORM
        ══════════════════════════════════════════ */}
        {view === "form" && selectedCategory && (
          <div>
            {/* Category banner */}
            <div style={{ background: CATEGORY_META[selectedCategory].bg, borderRadius: "0 0 20px 20px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "32px" }}>{CATEGORY_META[selectedCategory].icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: CATEGORY_META[selectedCategory].color, fontSize: "17px" }}>{CATEGORY_META[selectedCategory].label}</div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>Preencha os campos abaixo. Um protocolo será gerado automaticamente.</div>
              </div>
              <button onClick={() => setView("home")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#999" }}>✕</button>
            </div>

            <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              {/* Identification */}
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Nome completo *</label>
                <input type="text" placeholder="Como devemos te chamar?" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ ...inputStyle, borderColor: errors.name ? "#e53935" : "#e0e0e0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                  onBlur={(e) => (e.target.style.borderColor = errors.name ? "#e53935" : "#e0e0e0")} />
                {errors.name && <div style={{ color: "#e53935", fontSize: "11px", marginTop: "4px" }}>{errors.name}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>E-mail *</label>
                  <input type="email" placeholder="seu@email.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{ ...inputStyle, borderColor: errors.email ? "#e53935" : "#e0e0e0" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                    onBlur={(e) => (e.target.style.borderColor = errors.email ? "#e53935" : "#e0e0e0")} />
                  {errors.email && <div style={{ color: "#e53935", fontSize: "11px", marginTop: "4px" }}>{errors.email}</div>}
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp (opcional)</label>
                  <input type="tel" placeholder="(71) 99999-9999" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                    onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")} />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Assunto *</label>
                <input type="text" placeholder="Resuma brevemente o motivo do contato" value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  style={{ ...inputStyle, borderColor: errors.subject ? "#e53935" : "#e0e0e0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                  onBlur={(e) => (e.target.style.borderColor = errors.subject ? "#e53935" : "#e0e0e0")} />
                {errors.subject && <div style={{ color: "#e53935", fontSize: "11px", marginTop: "4px" }}>{errors.subject}</div>}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Mensagem * <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>({form.message.length} / mín. 20 caracteres)</span></label>
                <textarea placeholder="Descreva com detalhes..." value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: "100px", borderColor: errors.message ? "#e53935" : "#e0e0e0" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1565C0")}
                  onBlur={(e) => (e.target.style.borderColor = errors.message ? "#e53935" : "#e0e0e0")} />
                {errors.message && <div style={{ color: "#e53935", fontSize: "11px", marginTop: "4px" }}>{errors.message}</div>}
              </div>

              {/* Category change */}
              <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "10px 14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#666" }}>Categoria:</span>
                {(Object.entries(CATEGORY_META) as [TicketCategory, typeof CATEGORY_META[TicketCategory]][]).map(([key, meta]) => (
                  <button key={key} onClick={() => setSelectedCategory(key)}
                    style={{ padding: "4px 10px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: 600,
                      background: selectedCategory === key ? meta.color : "#e0e0e0",
                      color: selectedCategory === key ? "white" : "#666" }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width: "100%", padding: "14px", background: submitting ? "#ccc" : "linear-gradient(135deg, #1565C0, #0D47A1)", color: "white", border: "none", borderRadius: "12px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontSize: "15px", transition: "all 0.2s" }}>
                {submitting ? "⏳ Enviando..." : "📨 Enviar e Gerar Protocolo"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: SUCCESS
        ══════════════════════════════════════════ */}
        {view === "success" && createdTicket && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ background: "white", borderRadius: "20px", padding: "36px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
              <h2 style={{ fontWeight: 800, color: "#1a1a1a", fontSize: "20px", margin: "0 0 8px" }}>Protocolo gerado!</h2>
              <p style={{ color: "#666", fontSize: "14px", margin: "0 0 24px", lineHeight: "1.6" }}>
                Seu atendimento foi registrado com sucesso.<br />Guarde o número abaixo para acompanhar.
              </p>

              {/* Protocol box */}
              <div style={{ background: "linear-gradient(135deg, #e3f2fd, #bbdefb)", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px", border: "2px dashed #1565C0" }}>
                <div style={{ fontSize: "11px", color: "#1565C0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Número do Protocolo</div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "#0D47A1", letterSpacing: "2px" }}>{createdTicket.id}</div>
                <div style={{ fontSize: "11px", color: "#888", marginTop: "6px" }}>Aberto em {fmtDate(createdTicket.createdAt)}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px", textAlign: "left" }}>
                {[
                  { icon: CATEGORY_META[createdTicket.category].icon, label: "Categoria", value: CATEGORY_META[createdTicket.category].label },
                  { icon: "🟡", label: "Status", value: "Aberto" },
                  { icon: "✉️", label: "E-mail", value: createdTicket.email },
                  { icon: "📋", label: "Assunto", value: createdTicket.subject },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#f8f9fa", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "11px", color: "#aaa", textTransform: "uppercase", marginBottom: "3px" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "#333", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.icon} {item.value}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "12px", color: "#aaa", margin: "0 0 20px", lineHeight: "1.5" }}>
                Você pode acompanhar o andamento usando seu e-mail na aba "Acompanhar protocolo".
                Nossa equipe responde em até <strong>48 horas úteis</strong>.
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => {
                    setTrackEmail(createdTicket.email);
                    setTrackTickets(getTicketsByEmail(createdTicket.email));
                    setExpandedId(createdTicket.id);
                    setView("home");
                  }}
                  style={{ flex: 1, padding: "12px", background: "#1565C0", color: "white", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
                  Acompanhar
                </button>
                <button onClick={() => { setView("home"); setForm({ subject: "", message: "", name: "", email: "", phone: "" }); setErrors({}); }}
                  style={{ flex: 1, padding: "12px", background: "#f5f5f5", color: "#333", border: "none", borderRadius: "12px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                  Novo atendimento
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
