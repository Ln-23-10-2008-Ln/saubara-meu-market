/**
 * store-routes.ts — GET /api/stores + GET /api/stores/:id
 * B1 — Bloqueador resolvido.
 *
 * Fonte de dados:
 *   1. Lojas ESTÁTICAS inline (espelhadas do data.ts frontend)
 *   2. Vendedores APROVADOS no Turso (role=seller, approval_status=approved)
 *      – Sobrescreve loja estática se store_name bater (case-insensitive)
 *      – Cria entrada virtual se não bater
 *
 * Filtros querystring: category, localidade, featured, search, limit, offset
 */
import { Hono } from "hono";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq, and, or, isNotNull } from "drizzle-orm";

const storeRouter = new Hono();

// ─── Static store data (from data.ts) ─────────────────────────────────────────
const STATIC_STORES = [
  {
    id: "construcao-saubara",
    name: "Material de Construção Saubara",
    description: "Cimento, tintas, ferragens, hidráulica e tudo para sua reforma ou construção.",
    category: "construcao",
    whatsapp: "5571991110001",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=70",
    address: "Rua das Obras, 100 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sáb 7h–18h",
    rating: 4.5,
    featured: true,
    suspended: false,
    verified: true,
  },
  {
    id: "informatica-saubara",
    name: "Informática Saubara",
    description: "Periféricos, cabos, acessórios e suporte técnico para computadores.",
    category: "informatica",
    whatsapp: "5571991110002",
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=1200&q=70",
    address: "Av. Principal, 230 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sex 8h–18h | Sáb 8h–13h",
    rating: 4.3,
    featured: false,
    suspended: false,
    verified: true,
  },
  {
    id: "celulares-saubara",
    name: "Celulares & Acessórios Saubara",
    description: "Capas, películas, fones, carregadores e assistência técnica para smartphones.",
    category: "celulares",
    whatsapp: "5571991110003",
    imageUrl: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=70",
    address: "Rua Central, 45 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sáb 8h–19h",
    rating: 4.4,
    featured: false,
    suspended: false,
    verified: true,
  },
  {
    id: "moda-saubara",
    name: "Moda & Calçados Saubara",
    description: "Roupas masculinas, femininas e infantis, tênis, sandálias e acessórios de moda.",
    category: "moda",
    whatsapp: "5571991110004",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=70",
    address: "Rua das Flores, 78 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sáb 8h–20h",
    rating: 4.6,
    featured: true,
    suspended: false,
    verified: true,
  },
  {
    id: "cosmeticos-saubara",
    name: "Cosméticos & Beleza Saubara",
    description: "Cremes, perfumes, maquiagens, shampoos e produtos de cuidado pessoal.",
    category: "cosmeticos",
    whatsapp: "5571991110005",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=70",
    address: "Praça da Cultura, 12 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sáb 9h–18h",
    rating: 4.7,
    featured: true,
    suspended: false,
    verified: true,
  },
  {
    id: "papelaria-saubara",
    name: "Papelaria & Livraria Saubara",
    description: "Cadernos, canetas, mochilas, livros didáticos e material escolar completo.",
    category: "papelaria",
    whatsapp: "5571991110006",
    imageUrl: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=1200&q=70",
    address: "Rua da Escola, 55 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sex 7h30–18h | Sáb 7h30–12h",
    rating: 4.2,
    featured: false,
    suspended: false,
    verified: true,
  },
  {
    id: "utilidades-saubara",
    name: "Casa & Utilidades Saubara",
    description: "Panelas, vassouras, organizadores, utensílios domésticos e itens para o lar.",
    category: "utilidades",
    whatsapp: "5571991110007",
    imageUrl: "https://images.unsplash.com/photo-1584990347449-a2d4dce7e3e8?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1584990347449-a2d4dce7e3e8?w=1200&q=70",
    address: "Rua das Palmeiras, 33 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sáb 8h–18h",
    rating: 4.3,
    featured: false,
    suspended: false,
    verified: true,
  },
  {
    id: "artesanato-saubara",
    name: "Artesanato Saubara",
    description: "Kits de crochê, tintas para tecido, argila, cola quente e materiais artísticos.",
    category: "artesanato",
    whatsapp: "5571991110008",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=70",
    address: "Rua do Artesão, 20 – Saubara, BA",
    neighborhood: "Porto São Francisco",
    localidade: "porto_sao_francisco",
    hours: "Seg–Sex 9h–17h",
    rating: 4.8,
    featured: true,
    suspended: false,
    verified: true,
  },
  {
    id: "servicos-saubara",
    name: "Serviços Saubara",
    description: "Conserto de celular, corte de cabelo, design gráfico, aulas de reforço e mais.",
    category: "servicos",
    whatsapp: "5571991110009",
    imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200&q=70",
    address: "Av. Beira-Mar, 99 – Saubara, BA",
    neighborhood: "Sede",
    localidade: "sede",
    hours: "Seg–Sáb 8h–18h",
    rating: 4.5,
    featured: false,
    suspended: false,
    verified: true,
  },
];

// ─── Map Turso user row → Store shape ─────────────────────────────────────────
function userToStore(u: typeof users.$inferSelect) {
  let deliveryConfig: Record<string, unknown> | undefined;
  try { deliveryConfig = u.delivery_config_json ? JSON.parse(u.delivery_config_json) : undefined; } catch { /* ok */ }

  return {
    id: `merchant-${u.id}`,
    name: u.store_name ?? u.name,
    description: u.store_bio ?? `Loja em Saubara`,
    longDescription: u.store_bio ?? undefined,
    category: u.store_category ?? "utilidades",
    whatsapp: u.store_whatsapp ?? u.phone ?? "",
    imageUrl: u.store_logo ?? u.logo_loja ?? "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=70",
    coverUrl: u.store_cover ?? u.foto_fachada ?? "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=70",
    address: u.store_address ?? "Saubara, BA",
    neighborhood: u.store_localidade ?? "Sede",
    localidade: u.store_localidade ?? "sede",
    hours: u.store_hours ?? undefined,
    rating: 4.0,
    featured: false,
    suspended: u.subscription_status === "expired" || u.subscription_status === "suspended",
    verified: u.approval_status === "approved",
    joinedAt: u.created_at,
    deliveryConfig: deliveryConfig ?? { ownDelivery: false, pickup: true },
    products: [],
  };
}

// ─── GET /api/stores ──────────────────────────────────────────────────────────
storeRouter.get("/", async (c) => {
  const category   = c.req.query("category");
  const localidade = c.req.query("localidade");
  const featured   = c.req.query("featured");
  const search     = c.req.query("search");
  const limit      = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 100);
  const offset     = parseInt(c.req.query("offset") ?? "0", 10);

  // 1. Start with static stores
  const result = [...STATIC_STORES] as typeof STATIC_STORES[number][];

  // 2. Try to load active merchants from Turso — graceful fallback
  try {
    
    const merchants = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "seller"),
          eq(users.approval_status, "approved"),
          isNotNull(users.store_name)
        )
      );

    const staticNames = new Set(STATIC_STORES.map((s) => s.name.trim().toLowerCase()));

    for (const m of merchants) {
      const mName = (m.store_name ?? "").trim().toLowerCase();
      if (!mName) continue;

      if (staticNames.has(mName)) {
        // Merge into matching static entry
        const idx = result.findIndex((s) => s.name.trim().toLowerCase() === mName);
        if (idx !== -1) {
          const s = result[idx];
          result[idx] = {
            ...s,
            imageUrl:     m.store_logo     ?? m.logo_loja    ?? s.imageUrl,
            coverUrl:     m.store_cover    ?? m.foto_fachada ?? s.coverUrl,
            description:  m.store_bio      ?? s.description,
            hours:        m.store_hours    ?? s.hours,
            address:      m.store_address  ?? s.address,
            neighborhood: m.store_localidade ?? s.neighborhood,
            localidade:   m.store_localidade ?? s.localidade,
            whatsapp:     m.store_whatsapp  ?? s.whatsapp,
            verified:     true,
          };
        }
      } else {
        // Virtual merchant store
        result.push(userToStore(m) as any);
      }
    }
  } catch {
    // DB unavailable — static data still served
  }

  // 3. Filter
  let filtered = result.filter((s: any) => !s.suspended);

  if (category)   filtered = filtered.filter((s: any) => s.category === category);
  if (localidade) filtered = filtered.filter((s: any) => s.localidade === localidade);
  if (featured)   filtered = filtered.filter((s: any) => s.featured === true);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s: any) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  return c.json({ stores: paged, total, limit, offset });
});

// ─── GET /api/stores/:id ──────────────────────────────────────────────────────
storeRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  // Check static first
  const staticStore = STATIC_STORES.find((s) => s.id === id);
  if (staticStore) return c.json(staticStore);

  // Check Turso merchant
  if (id.startsWith("merchant-")) {
    const userId = id.replace("merchant-", "");
    try {
      
      const rows = await db.select().from(users).where(eq(users.id, userId));
      if (rows.length > 0 && rows[0].role === "seller") {
        return c.json(userToStore(rows[0]));
      }
    } catch {
      // fall through
    }
  }

  return c.json({ error: "Loja não encontrada." }, 404);
});

export { storeRouter as storeRoutes };
