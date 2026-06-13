// ─── Admin Reports & Metrics ──────────────────────────────────────────────────
import { useState, useMemo } from "react";
import type { AdminSeller, AdminClient, AdminProduct } from "../../lib/admin-data";
import { CATEGORY_META } from "../../lib/admin-data";

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = "7d" | "30d" | "90d" | "365d" | "all";

interface ReportsProps {
  sellers: AdminSeller[];
  clients: AdminClient[];
  products: AdminProduct[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cutoff(period: Period): Date {
  const now = new Date();
  if (period === "all") return new Date(0);
  const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[period];
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

function ptDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ptMonth(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

/** Build daily/weekly/monthly buckets for a list of ISO dates */
function bucketDates(dates: string[], period: Period): { label: string; count: number }[] {
  const from = cutoff(period);
  const filtered = dates
    .filter((d) => new Date(d) >= from)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (filtered.length === 0) return [];

  // Choose granularity
  const days = (Date.now() - from.getTime()) / 86_400_000;
  const useMonthly = days > 60;
  const useWeekly = days > 14 && days <= 60;

  const map = new Map<string, number>();
  for (const d of filtered) {
    const dt = new Date(d);
    let key: string;
    if (useMonthly) {
      key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    } else if (useWeekly) {
      // week start (Monday)
      const day = dt.getDay();
      const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(dt.setDate(diff));
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = dt.toISOString().slice(0, 10);
    }
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      let label: string;
      if (useMonthly) {
        const [y, m] = key.split("-");
        label = new Date(+y, +m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      } else if (useWeekly) {
        label = ptDate(key);
      } else {
        label = ptDate(key);
      }
      return { label, count };
    });
}

// ─── Mini bar chart (pure CSS/SVG, no lib) ───────────────────────────────────
function BarChart({
  data,
  color,
  height = 120,
}: {
  data: { label: string; count: number }[];
  color: string;
  height?: number;
}) {
  if (!data.length) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>
      Sem dados no período
    </div>
  );

  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = Math.max(8, Math.min(40, Math.floor(280 / data.length) - 4));

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, minWidth: data.length * (barW + 4) }}>
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((d.count / max) * (height - 24)));
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: "0 0 auto", width: barW }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#555" }}>{d.count}</span>
              <div
                style={{
                  width: "100%",
                  height: h,
                  background: color,
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s",
                  opacity: 0.85 + (i / data.length) * 0.15,
                }}
                title={`${d.label}: ${d.count}`}
              />
              <span style={{ fontSize: 9, color: "#999", whiteSpace: "nowrap", transform: "rotate(-30deg)", transformOrigin: "top left", marginTop: 2, marginLeft: 4 }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Horizontal bar for ranking ───────────────────────────────────────────────
function HBar({ label, value, max, color, emoji }: { label: string; value: number; max: number; color: string; emoji?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#444", display: "flex", alignItems: "center", gap: 4 }}>
          {emoji && <span>{emoji}</span>}
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 7, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon, color, bg, sub, trend,
}: {
  label: string; value: number | string; icon: string;
  color: string; bg: string; sub?: string; trend?: { value: number; up: boolean };
}) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: "18px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ width: 38, height: 38, background: bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 4 }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {trend && (
        <div style={{ fontSize: 11, fontWeight: 700, color: trend.up ? "#2e7d32" : "#c62828" }}>
          {trend.up ? "▲" : "▼"} {Math.abs(trend.value)} vs período anterior
        </div>
      )}
      <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#bbb" }}>{sub}</div>}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

// ─── Period Selector ─────────────────────────────────────────────────────────
function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "90d", label: "90 dias" },
    { key: "365d", label: "1 ano" },
    { key: "all", label: "Tudo" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            padding: "5px 14px",
            borderRadius: 20,
            border: "none",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            background: value === o.key ? "#1a1a2e" : "#f0f0f0",
            color: value === o.key ? "white" : "#555",
            transition: "all 0.15s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdminReports({ sellers, clients, products }: ReportsProps) {
  const [period, setPeriod] = useState<Period>("30d");

  const from = cutoff(period);

  // ── Filtered by period ──────────────────────────────────────────────────
  const sellersInPeriod = useMemo(() => sellers.filter((s) => new Date(s.registeredAt) >= from), [sellers, period]);
  const clientsInPeriod = useMemo(() => clients.filter((c) => new Date(c.registeredAt) >= from), [clients, period]);

  // ── KPIs (total, not filtered) ──────────────────────────────────────────
  const totalSellers = sellers.length;
  const totalClients = clients.length;
  const approvedStores = sellers.filter((s) => s.approvalStatus === "approved" && !s.suspended).length;
  const pendingStores = sellers.filter((s) => s.approvalStatus === "pending").length;
  const suspendedStores = sellers.filter((s) => s.approvalStatus === "suspended" || s.suspended).length;
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.active).length;
  const trialStores = sellers.filter((s) => s.subscription.status === "trial" && !s.suspended).length;
  const expiredStores = sellers.filter((s) => s.subscription.status === "expired" && !s.suspended).length;

  // ── Growth charts ───────────────────────────────────────────────────────
  const sellerDates = sellers.map((s) => s.registeredAt);
  const clientDates = clients.map((c) => c.registeredAt);
  const sellerBuckets = useMemo(() => bucketDates(sellerDates, period), [sellers, period]);
  const clientBuckets = useMemo(() => bucketDates(clientDates, period), [clients, period]);

  // ── Categories ──────────────────────────────────────────────────────────
  const catCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sellers) {
      map[s.storeCategory] = (map[s.storeCategory] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [sellers]);
  const maxCat = catCount[0]?.[1] ?? 1;

  // ── Localidades ─────────────────────────────────────────────────────────
  const locCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sellers) map[s.localidade] = (map[s.localidade] ?? 0) + 1;
    for (const c of clients) map[c.localidade] = (map[c.localidade] ?? 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sellers, clients]);
  const maxLoc = locCount[0]?.[1] ?? 1;

  // ── New registrations in period ─────────────────────────────────────────
  const newSellersPeriod = sellersInPeriod.length;
  const newClientsPeriod = clientsInPeriod.length;

  // ── Subscription health ─────────────────────────────────────────────────
  const subHealth = [
    { key: "trial",     label: "Período gratuito", count: trialStores,     color: "#0369a1", bg: "#e0f2fe" },
    { key: "approved",  label: "Lojas ativas",     count: approvedStores - trialStores,  color: "#2e7d32", bg: "#e8f5e9" },
    { key: "expired",   label: "Vencidas",          count: expiredStores,   color: "#b45309", bg: "#fef3c7" },
    { key: "suspended", label: "Suspensas",         count: suspendedStores, color: "#c62828", bg: "#ffebee" },
    { key: "pending",   label: "Aguardando",        count: pendingStores,   color: "#7c3aed", bg: "#f3e5f5" },
  ];

  // ── Top products by category ────────────────────────────────────────────
  const prodCatCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) map[p.category] = (map[p.category] ?? 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [products]);
  const maxProdCat = prodCatCount[0]?.[1] ?? 1;

  // ── Recent registrations table ──────────────────────────────────────────
  type RegEntry = { type: "seller" | "client"; name: string; sub?: string; date: string; localidade: string };
  const recentRegs: RegEntry[] = useMemo(() => {
    const list: RegEntry[] = [
      ...sellersInPeriod.slice(0, 5).map((s): RegEntry => ({
        type: "seller", name: s.storeName, sub: s.name, date: s.registeredAt, localidade: s.localidade,
      })),
      ...clientsInPeriod.slice(0, 5).map((c): RegEntry => ({
        type: "client", name: c.name, date: c.registeredAt, localidade: c.localidade,
      })),
    ];
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [sellersInPeriod, clientsInPeriod]);

  const tdS: React.CSSProperties = { padding: "10px 14px", fontSize: 12, borderBottom: "1px solid #f5f5f5", color: "#333" };
  const thS: React.CSSProperties = { padding: "9px 14px", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", background: "#f9fafb", borderBottom: "1px solid #f0f0f0", textAlign: "left" };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>📊 Relatórios & Métricas</h1>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Acompanhe o crescimento e a saúde da plataforma</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Clientes cadastrados"    value={totalClients}    icon="👥" color="#6a1b9a" bg="#f3e5f5" sub={`+${newClientsPeriod} no período`} />
        <KpiCard label="Comerciantes"            value={totalSellers}    icon="🏪" color="#1565c0" bg="#e3f2fd" sub={`+${newSellersPeriod} no período`} />
        <KpiCard label="Lojas aprovadas"         value={approvedStores}  icon="✅" color="#2e7d32" bg="#e8f5e9" />
        <KpiCard label="Aguardando aprovação"    value={pendingStores}   icon="⏳" color="#FF8A50" bg="#fff3e0" />
        <KpiCard label="Lojas suspensas"         value={suspendedStores} icon="🔴" color="#c62828" bg="#ffebee" />
        <KpiCard label="Produtos cadastrados"    value={totalProducts}   icon="📦" color="#0F9D8A" bg="#e0f7f4" sub={`${activeProducts} ativos`} />
      </div>

      {/* ── Growth Charts (2 col) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>
        <Section title={`🏪 Novos comerciantes (${period === "all" ? "total" : period})`}>
          <div style={{ marginBottom: 8, fontSize: 12, color: "#888" }}>
            <strong style={{ fontSize: 20, color: "#1565c0" }}>{newSellersPeriod}</strong> novos cadastros no período
          </div>
          <BarChart data={sellerBuckets} color="#1565c0" height={130} />
        </Section>

        <Section title={`👥 Novos clientes (${period === "all" ? "total" : period})`}>
          <div style={{ marginBottom: 8, fontSize: 12, color: "#888" }}>
            <strong style={{ fontSize: 20, color: "#6a1b9a" }}>{newClientsPeriod}</strong> novos cadastros no período
          </div>
          <BarChart data={clientBuckets} color="#6a1b9a" height={130} />
        </Section>
      </div>

      {/* ── Subscription health + Categories (2 col) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>

        {/* Subscription donut-style */}
        <Section title="💳 Saúde das assinaturas">
          {subHealth.map((s) => (
            <HBar key={s.key} label={s.label} value={s.count} max={totalSellers || 1} color={s.color} />
          ))}
          {/* Visual breakdown */}
          <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", marginTop: 12, gap: 1 }}>
            {subHealth.filter(s => s.count > 0).map((s) => (
              <div key={s.key} title={`${s.label}: ${s.count}`}
                style={{ flex: s.count, background: s.color, transition: "flex 0.5s" }} />
            ))}
          </div>
        </Section>

        {/* Categories */}
        <Section title="🏷️ Categorias mais utilizadas">
          {catCount.length === 0
            ? <p style={{ color: "#bbb", fontSize: 13 }}>Sem dados</p>
            : catCount.map(([cat, count]) => {
                const meta = CATEGORY_META[cat];
                return (
                  <HBar
                    key={cat}
                    label={meta?.label ?? cat}
                    value={count}
                    max={maxCat}
                    color={meta?.color ?? "#888"}
                    emoji={meta?.icon}
                  />
                );
              })}
        </Section>
      </div>

      {/* ── Localidades + Products (2 col) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>

        <Section title="📍 Localidades com mais usuários">
          {locCount.length === 0
            ? <p style={{ color: "#bbb", fontSize: 13 }}>Sem dados</p>
            : locCount.map(([loc, count]) => (
                <HBar key={loc} label={loc} value={count} max={maxLoc} color="#0F9D8A" emoji="📌" />
              ))}
        </Section>

        <Section title="📦 Produtos por categoria">
          {prodCatCount.length === 0
            ? <p style={{ color: "#bbb", fontSize: 13 }}>Sem dados</p>
            : prodCatCount.map(([cat, count]) => {
                const meta = CATEGORY_META[cat];
                return (
                  <HBar key={cat} label={meta?.label ?? cat} value={count} max={maxProdCat} color={meta?.color ?? "#888"} emoji={meta?.icon} />
                );
              })}
        </Section>
      </div>

      {/* ── Recent registrations table ── */}
      <Section title={`🕐 Cadastros recentes no período (${period === "all" ? "todos" : period})`}>
        {recentRegs.length === 0 ? (
          <p style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Nenhum cadastro no período selecionado</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thS}>Tipo</th>
                  <th style={thS}>Nome</th>
                  <th style={thS}>Localidade</th>
                  <th style={thS}>Data</th>
                </tr>
              </thead>
              <tbody>
                {recentRegs.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={tdS}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: r.type === "seller" ? "#e3f2fd" : "#f3e5f5",
                        color: r.type === "seller" ? "#1565c0" : "#6a1b9a",
                      }}>
                        {r.type === "seller" ? "🏪 Comerciante" : "👤 Cliente"}
                      </span>
                    </td>
                    <td style={tdS}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                      {r.sub && <div style={{ fontSize: 11, color: "#888" }}>{r.sub}</div>}
                    </td>
                    <td style={{ ...tdS, color: "#555" }}>{r.localidade}</td>
                    <td style={{ ...tdS, color: "#888", whiteSpace: "nowrap" }}>
                      {new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Platform summary card ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderRadius: 16, padding: "22px 24px", color: "white" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>📈 Resumo da plataforma</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 16 }}>
          {[
            { label: "Total usuários",    value: totalClients + totalSellers,  icon: "👥" },
            { label: "Lojas na plataforma", value: totalSellers,               icon: "🏪" },
            { label: "Produtos listados", value: totalProducts,                icon: "📦" },
            { label: "Taxa de aprovação", value: `${totalSellers > 0 ? Math.round((approvedStores / totalSellers) * 100) : 0}%`, icon: "✅" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#FF8A50" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
