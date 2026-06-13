// ─── Central de Atendimento ───────────────────────────────────────────────────

export type TicketCategory = "reclamacao" | "sugestao" | "denuncia" | "duvida";
export type TicketStatus   = "aberto" | "em_analise" | "respondido" | "encerrado";

export interface Ticket {
  id: string;           // protocol number e.g. SAU-2026-001234
  category: TicketCategory;
  status: TicketStatus;
  subject: string;
  message: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;    // ISO string
  updatedAt: string;
  responses: TicketResponse[];
  rating?: 1 | 2 | 3 | 4 | 5;  // user satisfaction after closing
}

export interface TicketResponse {
  id: string;
  from: "admin" | "user";
  authorName: string;
  message: string;
  createdAt: string;
}

const KEY = "saubara_tickets";

export const CATEGORY_META: Record<TicketCategory, { label: string; icon: string; color: string; bg: string }> = {
  reclamacao: { label: "Reclamação",  icon: "😤", color: "#e53935", bg: "#fdecea" },
  sugestao:   { label: "Sugestão",    icon: "💡", color: "#F57C00", bg: "#fff3e0" },
  denuncia:   { label: "Denúncia",    icon: "🚨", color: "#8e24aa", bg: "#f3e5f5" },
  duvida:     { label: "Dúvida",      icon: "❓", color: "#1565C0", bg: "#e3f2fd" },
};

export const STATUS_META: Record<TicketStatus, { label: string; icon: string; color: string; bg: string }> = {
  aberto:      { label: "Aberto",      icon: "🟡", color: "#F57C00", bg: "#fff8e1" },
  em_analise:  { label: "Em análise",  icon: "🔵", color: "#1565C0", bg: "#e3f2fd" },
  respondido:  { label: "Respondido",  icon: "🟢", color: "#2e7d32", bg: "#e8f5e9" },
  encerrado:   { label: "Encerrado",   icon: "⚪", color: "#757575", bg: "#f5f5f5" },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(): Ticket[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(tickets: Ticket[]) {
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

function generateId(): string {
  const year = new Date().getFullYear();
  const seq  = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `SAU-${year}-${seq}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createTicket(data: {
  category: TicketCategory;
  subject: string;
  message: string;
  name: string;
  email: string;
  phone?: string;
}): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: generateId(),
    status: "aberto",
    responses: [],
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  const all = load();
  all.unshift(ticket);
  save(all);
  return ticket;
}

export function getAllTickets(): Ticket[] {
  return load();
}

export function getTicketById(id: string): Ticket | undefined {
  return load().find((t) => t.id === id);
}

export function getTicketsByEmail(email: string): Ticket[] {
  return load().filter((t) => t.email.toLowerCase() === email.toLowerCase());
}

export function updateTicketStatus(id: string, status: TicketStatus): boolean {
  const all = load();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  all[idx].status    = status;
  all[idx].updatedAt = new Date().toISOString();
  save(all);
  return true;
}

export function addResponse(ticketId: string, response: {
  from: "admin" | "user";
  authorName: string;
  message: string;
}): boolean {
  const all = load();
  const idx = all.findIndex((t) => t.id === ticketId);
  if (idx === -1) return false;
  const now = new Date().toISOString();
  all[idx].responses.push({ id: uid(), createdAt: now, ...response });
  all[idx].updatedAt = now;
  // auto-set status when admin replies
  if (response.from === "admin" && all[idx].status === "aberto") {
    all[idx].status = "respondido";
  }
  save(all);
  return true;
}

export function rateTicket(id: string, rating: 1 | 2 | 3 | 4 | 5): boolean {
  const all = load();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  all[idx].rating    = rating;
  all[idx].status    = "encerrado";
  all[idx].updatedAt = new Date().toISOString();
  save(all);
  return true;
}

export function deleteTicket(id: string): boolean {
  const all = load();
  const filtered = all.filter((t) => t.id !== id);
  if (filtered.length === all.length) return false;
  save(filtered);
  return true;
}

// ─── Seed demo data ───────────────────────────────────────────────────────────

export function seedDemoTickets() {
  const existing = load();
  if (existing.length > 0) return; // only seed when storage is empty

  const now = Date.now();

  const makeUid = () => Math.random().toString(36).slice(2, 10);
  const makeTs  = (msAgo: number) => new Date(now - msAgo).toISOString();

  const demo: Ticket[] = [
    // 1 — Reclamação aberta (30min atrás)
    {
      id: `SAU-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      category: "reclamacao",
      status:   "aberto",
      subject:  "Demora na entrega — mais de 24h sem retorno",
      message:  "Fiz um pedido na Farmácia Saúde há mais de um dia e ninguém me respondeu no WhatsApp. O site diz entrega em até 24h. Preciso de uma solução urgente.",
      name:     "Fernanda Costa",
      email:    "fernanda.costa@gmail.com",
      phone:    "(75) 98123-4567",
      createdAt: makeTs(30 * 60000),
      updatedAt: makeTs(30 * 60000),
      responses: [],
    },
    // 2 — Reclamação aberta (3h atrás)
    {
      id: `SAU-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      category: "reclamacao",
      status:   "aberto",
      subject:  "Produto errado entregue pelo mercado",
      message:  "Fiz um pedido na Mercearia do Zé e recebi um produto diferente do que pedi. Pedi arroz tipo 1 e recebi tipo 2. Quero solução urgente.",
      name:     "Maria Santos",
      email:    "maria.santos@email.com",
      phone:    "(75) 98888-1234",
      createdAt: makeTs(3 * 3600000),
      updatedAt: makeTs(3 * 3600000),
      responses: [],
    },
    // 3 — Sugestão em análise (1 dia atrás, com resposta)
    {
      id: `SAU-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      category: "sugestao",
      status:   "em_analise",
      subject:  "Adicionar filtro por bairro na busca",
      message:  "Seria muito útil poder filtrar as lojas por bairro aqui em Saubara. Facilitaria bastante encontrar fornecedores próximos de casa.",
      name:     "João Oliveira",
      email:    "joao.oliveira@gmail.com",
      createdAt: makeTs(86400000),
      updatedAt: makeTs(20 * 3600000),
      responses: [
        {
          id: makeUid(),
          from: "admin",
          authorName: "Equipe Saubara Meu Market",
          message: "Obrigado pela sugestão, João! Já anotamos e vamos avaliar para as próximas atualizações da plataforma.",
          createdAt: makeTs(20 * 3600000),
        },
      ],
    },
    // 4 — Denúncia respondida (2 dias atrás)
    {
      id: `SAU-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      category: "denuncia",
      status:   "respondido",
      subject:  "Loja cobrando valor diferente do anunciado",
      message:  "O Açougue Central está anunciando um preço no site e cobrando outro no WhatsApp. Diferença de R$ 5,00 no kg da picanha.",
      name:     "Ana Lima",
      email:    "ana.lima@hotmail.com",
      phone:    "(75) 99777-5566",
      createdAt: makeTs(2 * 86400000),
      updatedAt: makeTs(36 * 3600000),
      responses: [
        {
          id: makeUid(),
          from: "admin",
          authorName: "Equipe Saubara Meu Market",
          message: "Obrigada pela denúncia, Ana! Já entramos em contato com o estabelecimento e solicitamos a correção imediata dos preços. Acompanharemos o caso e retornaremos em breve.",
          createdAt: makeTs(36 * 3600000),
        },
      ],
    },
    // 5 — Dúvida encerrada com avaliação 5 estrelas (4 dias atrás)
    {
      id: `SAU-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      category: "duvida",
      status:   "encerrado",
      subject:  "Como rastrear meu pedido?",
      message:  "Quero saber como acompanhar o status do meu pedido após enviar pelo WhatsApp. Tem algum número de protocolo ou sistema de rastreamento?",
      name:     "Carlos Ferreira",
      email:    "carlos.ferreira@yahoo.com",
      rating:   5,
      createdAt: makeTs(4 * 86400000),
      updatedAt: makeTs(80 * 3600000),
      responses: [
        {
          id: makeUid(),
          from: "admin",
          authorName: "Equipe Saubara Meu Market",
          message: "Olá Carlos! O acompanhamento é feito diretamente via WhatsApp com a loja. Cada loja confirma e atualiza o status pelo próprio contato. Aqui no portal você pode usar a Central de Atendimento para registrar qualquer problema. Qualquer dúvida, estamos aqui!",
          createdAt: makeTs(80 * 3600000),
        },
      ],
    },
  ];

  save(demo);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getTicketStats() {
  const all = load();
  return {
    total:       all.length,
    aberto:      all.filter((t) => t.status === "aberto").length,
    em_analise:  all.filter((t) => t.status === "em_analise").length,
    respondido:  all.filter((t) => t.status === "respondido").length,
    encerrado:   all.filter((t) => t.status === "encerrado").length,
    reclamacao:  all.filter((t) => t.category === "reclamacao").length,
    sugestao:    all.filter((t) => t.category === "sugestao").length,
    denuncia:    all.filter((t) => t.category === "denuncia").length,
    duvida:      all.filter((t) => t.category === "duvida").length,
    avgRating:   (() => {
      const rated = all.filter((t) => t.rating);
      return rated.length ? (rated.reduce((s, t) => s + (t.rating || 0), 0) / rated.length).toFixed(1) : "—";
    })(),
  };
}
