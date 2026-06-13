/**
 * product-routes.ts — GET /api/products + GET /api/products/:id
 * Turso-first: lê da tabela `products`. Fallback: STATIC_PRODUCTS (44 itens)
 * Filtros: category, storeId, search, featured, limit, offset
 */
import { Hono } from "hono";
import { db } from "../db/client";
import { products } from "../db/schema";

const route = new Hono();

// ─── Static fallback (44 produtos) ──────────────────────────────────────────
const STATIC_PRODUCTS = [
  // ── Construção Saubara
  { id: "cimento-50kg",       name: "Cimento CP-II — 50kg",               price: "42",  category: "construcao",  store_id: "construcao-saubara",  image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=70",  available: true,  featured: false },
  { id: "tinta-18l",          name: "Tinta Acrílica — 18L",               price: "149", category: "construcao",  store_id: "construcao-saubara",  image_url: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&q=70",  available: true,  featured: false },
  { id: "areia-tracos",       name: "Areia Grossa — saco 20kg",           price: "18",  category: "construcao",  store_id: "construcao-saubara",  image_url: "https://images.unsplash.com/photo-1590547409659-1a3c8d63b67e?w=400&q=70", available: true,  featured: false },
  { id: "tijolos-cx20",       name: "Tijolo Cerâmico — caixa 20un",       price: "56",  category: "construcao",  store_id: "construcao-saubara",  image_url: "https://images.unsplash.com/photo-1597484661753-c5a5d1a7c29c?w=400&q=70", available: true,  featured: false },
  { id: "ferragem-5mm",       name: "Vergalhão 5mm — barra 12m",          price: "38",  category: "construcao",  store_id: "construcao-saubara",  image_url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=70", available: true,  featured: false },
  // ── Informática
  { id: "mouse-usb",          name: "Mouse USB Óptico",                   price: "39",  category: "informatica", store_id: "informatica-saubara", image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=70", available: true,  featured: false },
  { id: "teclado-abnt2",      name: "Teclado ABNT2 USB",                  price: "79",  category: "informatica", store_id: "informatica-saubara", image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=70", available: true,  featured: false },
  { id: "cabo-hdmi-2m",       name: "Cabo HDMI 2m Full HD",               price: "29",  category: "informatica", store_id: "informatica-saubara", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70",   available: true,  featured: false },
  { id: "hub-usb-4p",         name: "Hub USB 4 Portas",                   price: "49",  category: "informatica", store_id: "informatica-saubara", image_url: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&q=70", available: true,  featured: false },
  { id: "carregador-note",    name: "Carregador Universal Notebook",      price: "129", category: "informatica", store_id: "informatica-saubara", image_url: "https://images.unsplash.com/photo-1583394293214-3b5c8b4a9a0e?w=400&q=70", available: true,  featured: false },
  // ── Celulares
  { id: "pelicula-iphone",    name: "Película Vidro iPhone 13/14",        price: "25",  category: "celulares",   store_id: "celulares-saubara",   image_url: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&q=70",  available: true,  featured: false },
  { id: "capa-samsung-a54",   name: "Capa Samsung A54 Antichoque",        price: "35",  category: "celulares",   store_id: "celulares-saubara",   image_url: "https://images.unsplash.com/photo-1614434284929-58b3f6a89f7c?w=400&q=70", available: true,  featured: false },
  { id: "fone-bluetooth",     name: "Fone Bluetooth sem fio",             price: "89",  category: "celulares",   store_id: "celulares-saubara",   image_url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=70",  available: true,  featured: false },
  { id: "cabo-usb-c-2m",      name: "Cabo USB-C 2m Turbo",                price: "22",  category: "celulares",   store_id: "celulares-saubara",   image_url: "https://images.unsplash.com/photo-1588776814546-daab30f310ce?w=400&q=70", available: true,  featured: false },
  { id: "power-bank-10k",     name: "Power Bank 10.000mAh",               price: "119", category: "celulares",   store_id: "celulares-saubara",   image_url: "https://images.unsplash.com/photo-1609767291667-58c6e6d399e2?w=400&q=70", available: true,  featured: false },
  // ── Moda
  { id: "camiseta-basica-m",  name: "Camiseta Básica Algodão M",          price: "39",  category: "moda",        store_id: "moda-saubara",        image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=70", available: true,  featured: true  },
  { id: "bermuda-jeans-42",   name: "Bermuda Jeans Masculina 42",         price: "79",  category: "moda",        store_id: "moda-saubara",        image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=70",  available: true,  featured: false },
  { id: "vestido-floral",     name: "Vestido Floral Feminino",            price: "99",  category: "moda",        store_id: "moda-saubara",        image_url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=70", available: true,  featured: false },
  { id: "tenis-branco-38",    name: "Tênis Branco Feminino 38",           price: "149", category: "moda",        store_id: "moda-saubara",        image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=70",  available: true,  featured: false },
  { id: "sandalia-masculina", name: "Sandália Masculina Couro",           price: "89",  category: "moda",        store_id: "moda-saubara",        image_url: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&q=70", available: true,  featured: false },
  // ── Cosméticos
  { id: "creme-facial-50ml",  name: "Creme Facial Hidratante 50ml",       price: "49",  category: "cosmeticos",  store_id: "cosmeticos-saubara",  image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=70", available: true,  featured: true  },
  { id: "shampoo-cachos",     name: "Shampoo Cachos 300ml",               price: "32",  category: "cosmeticos",  store_id: "cosmeticos-saubara",  image_url: "https://images.unsplash.com/photo-1556760544-74068565f05c?w=400&q=70", available: true,  featured: false },
  { id: "batom-vermelho",     name: "Batom Líquido Matte Vermelho",       price: "29",  category: "cosmeticos",  store_id: "cosmeticos-saubara",  image_url: "https://images.unsplash.com/photo-1583241801015-29e14e5b8e0c?w=400&q=70", available: true, featured: false },
  { id: "perfume-feminino",   name: "Perfume Feminino 50ml",              price: "139", category: "cosmeticos",  store_id: "cosmeticos-saubara",  image_url: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=70", available: true, featured: false },
  { id: "kit-maquiagem",      name: "Kit Maquiagem Iniciante",            price: "79",  category: "cosmeticos",  store_id: "cosmeticos-saubara",  image_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=70", available: true, featured: false },
  // ── Papelaria
  { id: "caderno-a4-200f",    name: "Caderno A4 200 Folhas",              price: "32",  category: "papelaria",   store_id: "papelaria-saubara",   image_url: "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=400&q=70", available: true, featured: false },
  { id: "caneta-azul-12",     name: "Caneta Azul — caixa 12un",           price: "18",  category: "papelaria",   store_id: "papelaria-saubara",   image_url: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&q=70", available: true, featured: false },
  { id: "mochila-escolar",    name: "Mochila Escolar 30L",                price: "129", category: "papelaria",   store_id: "papelaria-saubara",   image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=70",  available: true, featured: false },
  { id: "livro-matematica",   name: "Livro Matemática 9º ano",            price: "65",  category: "papelaria",   store_id: "papelaria-saubara",   image_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=70", available: true, featured: false },
  { id: "estojo-escolar",     name: "Estojo Escolar com Divisórias",      price: "42",  category: "papelaria",   store_id: "papelaria-saubara",   image_url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=70", available: true, featured: false },
  // ── Utilidades
  { id: "vassoura-40cm",      name: "Vassoura 40cm Cerdas Macias",        price: "22",  category: "utilidades",  store_id: "utilidades-saubara",  image_url: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=70", available: true, featured: false },
  { id: "balde-15l",          name: "Balde Plástico 15L",                 price: "28",  category: "utilidades",  store_id: "utilidades-saubara",  image_url: "https://images.unsplash.com/photo-1581622558663-b2e33377dfb2?w=400&q=70", available: true, featured: false },
  { id: "conjunto-panelas",   name: "Conjunto Panelas 5 Peças Inox",      price: "299", category: "utilidades",  store_id: "utilidades-saubara",  image_url: "https://images.unsplash.com/photo-1584990347449-a2d4dce7e3e8?w=400&q=70", available: true, featured: true  },
  { id: "organizador-gaveta", name: "Organizador de Gaveta 6 Div.",       price: "39",  category: "utilidades",  store_id: "utilidades-saubara",  image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70",  available: true, featured: false },
  { id: "rodo-multiuso",      name: "Rodo Multiuso 60cm",                 price: "35",  category: "utilidades",  store_id: "utilidades-saubara",  image_url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=70", available: true, featured: false },
  // ── Artesanato
  { id: "kit-croche",         name: "Kit Crochê Iniciante",               price: "59",  category: "artesanato",  store_id: "artesanato-saubara",  image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70",  available: true, featured: true  },
  { id: "tinta-tecido-6",     name: "Tinta Tecido — 6 cores",             price: "44",  category: "artesanato",  store_id: "artesanato-saubara",  image_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=70", available: true, featured: false },
  { id: "argila-colorida",    name: "Argila Colorida 500g",               price: "29",  category: "artesanato",  store_id: "artesanato-saubara",  image_url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=70", available: true, featured: false },
  { id: "cola-quente-100",    name: "Cola Quente — 100 bastões",          price: "49",  category: "artesanato",  store_id: "artesanato-saubara",  image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=70",  available: true, featured: false },
  { id: "kit-pintura-aqua",   name: "Kit Pintura Aquarela 24 cores",      price: "69",  category: "artesanato",  store_id: "artesanato-saubara",  image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=70", available: true, featured: false },
  // ── Serviços
  { id: "conserto-celular",   name: "Conserto de Tela — iPhone/Samsung",  price: "189", category: "servicos",    store_id: "servicos-saubara",    image_url: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=70", available: true, featured: true  },
  { id: "corte-cabelo-m",     name: "Corte de Cabelo Masculino",          price: "25",  category: "servicos",    store_id: "servicos-saubara",    image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=70", available: true, featured: false },
  { id: "design-logo",        name: "Design de Logo Profissional",        price: "350", category: "servicos",    store_id: "servicos-saubara",    image_url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=70", available: true, featured: false },
  { id: "aula-reforco",       name: "Aula Reforço Matemática — 1h",       price: "60",  category: "servicos",    store_id: "servicos-saubara",    image_url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&q=70", available: true, featured: false },
];

function normalise(p: any) {
  return {
    id:          p.id,
    name:        p.name,
    price:       typeof p.price === "number" ? p.price : parseFloat(p.price ?? "0"),
    category:    p.category     ?? null,
    storeId:     p.store_id     ?? p.storeId ?? null,
    image:       p.image_url    ?? p.image   ?? null,
    available:   p.available    ?? true,
    featured:    p.featured     ?? false,
    description: p.description  ?? null,
    unit:        p.unit         ?? null,
    stock:       p.stock        ?? null,
    sales:       p.sales        ?? 0,
  };
}

// ─── GET /api/products ────────────────────────────────────────────────────────
route.get("/", async (c) => {
  const category = c.req.query("category");
  const storeId  = c.req.query("storeId");
  const search   = c.req.query("search");
  const featured = c.req.query("featured");
  const limit    = parseInt(c.req.query("limit")  ?? "20", 10);
  const offset   = parseInt(c.req.query("offset") ?? "0",  10);

  let source: any[] = [];
  try {
    const rows = await db.select().from(products);
    source = rows.length > 0 ? rows : STATIC_PRODUCTS;
  } catch {
    source = STATIC_PRODUCTS;
  }

  let filtered = source.map(normalise);
  if (category) filtered = filtered.filter(p => p.category === category);
  if (storeId)  filtered = filtered.filter(p => p.storeId  === storeId);
  if (featured) filtered = filtered.filter(p => p.featured === true);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);
  return c.json({ products: paged, total, limit, offset });
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
route.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const rows = await db.select().from(products);
    const all  = rows.length > 0 ? rows : STATIC_PRODUCTS;
    const p    = all.find((r: any) => r.id === id);
    if (!p) return c.json({ error: "Produto não encontrado." }, 404);
    return c.json(normalise(p));
  } catch {
    const p = STATIC_PRODUCTS.find(r => r.id === id);
    if (!p) return c.json({ error: "Produto não encontrado." }, 404);
    return c.json(normalise(p));
  }
});

export { route as productRoutes };
