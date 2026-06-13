// ─── Admin mock data for demonstration ────────────────────────────────────────
// In production this would come from a real database/API.

import type { SubscriptionStatus, ApprovalStatus } from "./auth";

export interface SellerPhotos {
  photoResponsavel?: string;   // foto/RG do responsável (base64 ou URL)
  logoLoja?: string;           // logo da loja
  fotoFachada?: string;        // fachada do estabelecimento (opcional)
}

export interface AdminSeller {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  storeName: string;
  storeCategory: string;
  localidade: string;
  registeredAt: string;   // ISO
  subscription: {
    registeredAt: string;
    trialEndsAt: string;
    expiresAt: string;
    status: SubscriptionStatus;
  };
  approvalStatus: ApprovalStatus;
  approvalNote?: string;
  suspended: boolean;
  photos?: SellerPhotos;        // fotos enviadas no cadastro
}

export interface AdminClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  localidade: string;
  registeredAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  storeId: string;
  storeName: string;
  category: string;
  price: number;
  active: boolean;
}

// ── helper to build date strings ───────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ── Mock Sellers ──────────────────────────────────────────────────────────────

export const MOCK_SELLERS: AdminSeller[] = [
  {
    id: "seller-demo-1",
    name: "Carlos Pereira",
    email: "carlos@construcaosaubara.com",
    phone: "75991110001",
    cpf: "123.456.789-09",
    storeName: "Material de Construção Saubara",
    storeCategory: "construcao",
    localidade: "Entrada de Saubara",
    registeredAt: daysAgo(45),
    approvalStatus: "approved",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(45),
      trialEndsAt: daysAgo(15),
      expiresAt: daysFromNow(15),
      status: "active",
    },
    photos: {
      photoResponsavel: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=70",
      logoLoja: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&q=70",
      fotoFachada: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=70",
    },
  },
  {
    id: "seller-demo-2",
    name: "Fernanda Lima",
    email: "fernanda@infotech.com",
    phone: "75991110002",
    cpf: "234.567.890-10",
    storeName: "InfoTech Saubara",
    storeCategory: "informatica",
    localidade: "Sede de Saubara",
    registeredAt: daysAgo(20),
    approvalStatus: "approved",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(20),
      trialEndsAt: daysFromNow(10),
      expiresAt: daysFromNow(10),
      status: "trial",
    },
    photos: {
      photoResponsavel: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&q=70",
      logoLoja: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&q=70",
    },
  },
  {
    id: "seller-demo-3",
    name: "Maria Santos",
    email: "maria@exemplo.com",
    phone: "11999990002",
    cpf: "345.678.901-11",
    storeName: "Maria Cosméticos",
    storeCategory: "cosmeticos",
    localidade: "Cabuçu",
    registeredAt: daysAgo(5),
    approvalStatus: "approved",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(5),
      trialEndsAt: daysFromNow(25),
      expiresAt: daysFromNow(25),
      status: "trial",
    },
    photos: {
      photoResponsavel: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=70",
      logoLoja: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&q=70",
      fotoFachada: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=70",
    },
  },
  {
    id: "seller-demo-4",
    name: "Roberto Alves",
    email: "roberto@modabahia.com",
    phone: "75991110004",
    cpf: "456.789.012-22",
    storeName: "Moda Bahia Saubara",
    storeCategory: "moda",
    localidade: "Praia do Sol",
    registeredAt: daysAgo(70),
    approvalStatus: "approved",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(70),
      trialEndsAt: daysAgo(40),
      expiresAt: daysAgo(2),
      status: "expired",
    },
  },
  {
    id: "seller-demo-5",
    name: "Juliana Costa",
    email: "juliana@artesanato.com",
    phone: "75991110005",
    cpf: "567.890.123-33",
    storeName: "Arte & Mãos Saubara",
    storeCategory: "artesanato",
    localidade: "Sede de Saubara",
    registeredAt: daysAgo(90),
    approvalStatus: "suspended",
    suspended: true,
    subscription: {
      registeredAt: daysAgo(90),
      trialEndsAt: daysAgo(60),
      expiresAt: daysAgo(30),
      status: "suspended",
    },
  },
  {
    id: "seller-demo-6",
    name: "Paulo Nascimento",
    email: "paulo@papelaria.com",
    phone: "75991110006",
    cpf: "678.901.234-44",
    storeName: "Papelaria Saubara",
    storeCategory: "papelaria",
    localidade: "Recreio",
    registeredAt: daysAgo(3),
    approvalStatus: "pending",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(3),
      trialEndsAt: daysFromNow(27),
      expiresAt: daysFromNow(27),
      status: "trial",
    },
    photos: {
      photoResponsavel: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=70",
      logoLoja: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=300&q=70",
      fotoFachada: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&q=70",
    },
  },
  {
    id: "seller-demo-7",
    name: "Sônia Brito",
    email: "sonia@utilidades.com",
    phone: "75991110007",
    cpf: "789.012.345-55",
    storeName: "Casa & Lar Saubara",
    storeCategory: "utilidades",
    localidade: "Sede de Saubara",
    registeredAt: daysAgo(12),
    approvalStatus: "approved",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(12),
      trialEndsAt: daysFromNow(18),
      expiresAt: daysFromNow(18),
      status: "trial",
    },
  },
  {
    id: "seller-demo-8",
    name: "Tiago Ferreira",
    email: "tiago@celulares.com",
    phone: "75991110008",
    cpf: "890.123.456-66",
    storeName: "Celulares & Acessórios",
    storeCategory: "celulares",
    localidade: "Porto",
    registeredAt: daysAgo(60),
    approvalStatus: "approved",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(60),
      trialEndsAt: daysAgo(30),
      expiresAt: daysFromNow(5),
      status: "active",
    },
  },
  {
    id: "seller-demo-9",
    name: "Lúcia Mendes",
    email: "lucia@mercearia.com",
    phone: "75991110009",
    cpf: "901.234.567-77",
    storeName: "Mercearia Mendes",
    storeCategory: "utilidades",
    localidade: "Cabuçu",
    registeredAt: daysAgo(1),
    approvalStatus: "rejected",
    approvalNote: "Documentação incompleta. Por favor, reenvie com foto do RG e comprovante de endereço.",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(1),
      trialEndsAt: daysFromNow(29),
      expiresAt: daysFromNow(29),
      status: "trial",
    },
    photos: {
      photoResponsavel: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=70",
      // sem logo — propositalmente incompleto para demo
    },
  },
  {
    id: "seller-demo-10",
    name: "Diego Santana",
    email: "diego@hortifruti.com",
    phone: "75991110010",
    cpf: "012.345.678-88",
    storeName: "Hortifruti Santana",
    storeCategory: "servicos",
    localidade: "Sede de Saubara",
    registeredAt: daysAgo(2),
    approvalStatus: "pending",
    suspended: false,
    subscription: {
      registeredAt: daysAgo(2),
      trialEndsAt: daysFromNow(28),
      expiresAt: daysFromNow(28),
      status: "trial",
    },
    photos: {
      photoResponsavel: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=70",
      logoLoja: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=70",
      fotoFachada: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=500&q=70",
    },
  },
];

// ── Mock Clients ──────────────────────────────────────────────────────────────

export const MOCK_CLIENTS: AdminClient[] = [
  { id: "client-demo-1", name: "João Silva",     email: "joao@exemplo.com",    phone: "11999990001", localidade: "Sede de Saubara",    registeredAt: daysAgo(30) },
  { id: "client-demo-2", name: "Ana Lima",       email: "ana@exemplo.com",     phone: "75999991111", localidade: "Cabuçu",             registeredAt: daysAgo(25) },
  { id: "client-demo-3", name: "Bia Souza",      email: "bia@exemplo.com",     phone: "75999992222", localidade: "Praia do Sol",       registeredAt: daysAgo(18) },
  { id: "client-demo-4", name: "Carlos Melo",    email: "carlos.m@exemplo.com",phone: "75999993333", localidade: "Sede de Saubara",registeredAt: daysAgo(14) },
  { id: "client-demo-5", name: "Diana Ramos",    email: "diana@exemplo.com",   phone: "75999994444", localidade: "Recreio",            registeredAt: daysAgo(10) },
  { id: "client-demo-6", name: "Eduardo Castro", email: "edu@exemplo.com",     phone: "75999995555", localidade: "Sede de Saubara",    registeredAt: daysAgo(8)  },
  { id: "client-demo-7", name: "Flávia Nunes",   email: "flavia@exemplo.com",  phone: "75999996666", localidade: "Araripe",            registeredAt: daysAgo(5)  },
  { id: "client-demo-8", name: "Gustavo Reis",   email: "gustavo@exemplo.com", phone: "75999997777", localidade: "Porto",              registeredAt: daysAgo(3)  },
  { id: "client-demo-9", name: "Helena Moura",   email: "helena@exemplo.com",  phone: "75999998888", localidade: "Quiboa",             registeredAt: daysAgo(2)  },
  { id: "client-demo-10",name: "Igor Pinto",     email: "igor@exemplo.com",    phone: "75999999999", localidade: "Sede de Saubara",    registeredAt: daysAgo(1)  },
  { id: "client-demo-11",name: "Janaína Luz",    email: "janaina@exemplo.com", phone: "75988881111", localidade: "Pedras Altas",       registeredAt: daysAgo(0)  },
  { id: "client-demo-12",name: "Kátia Borges",   email: "katia@exemplo.com",   phone: "75988882222", localidade: "Cabuçu",             registeredAt: daysAgo(0)  },
];

// ── Mock Products ─────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS: AdminProduct[] = [
  { id: "p-1",  name: "Cimento Portland 50kg",        storeId: "seller-demo-1", storeName: "Material de Construção Saubara", category: "construcao", price: 35.90,  active: true  },
  { id: "p-2",  name: "Tinta Acrílica 18L",           storeId: "seller-demo-1", storeName: "Material de Construção Saubara", category: "construcao", price: 189.00, active: true  },
  { id: "p-3",  name: "Notebook Core i5",             storeId: "seller-demo-2", storeName: "InfoTech Saubara",              category: "informatica", price: 2499.00,active: true  },
  { id: "p-4",  name: "Mouse Sem Fio",                storeId: "seller-demo-2", storeName: "InfoTech Saubara",              category: "informatica", price: 59.90,  active: true  },
  { id: "p-5",  name: "Batom Vermelho Intenso",       storeId: "seller-demo-3", storeName: "Maria Cosméticos",              category: "cosmeticos",  price: 29.90,  active: true  },
  { id: "p-6",  name: "Base Líquida FPS30",           storeId: "seller-demo-3", storeName: "Maria Cosméticos",              category: "cosmeticos",  price: 49.90,  active: true  },
  { id: "p-7",  name: "Paleta de Sombras 12 Cores",   storeId: "seller-demo-3", storeName: "Maria Cosméticos",              category: "cosmeticos",  price: 89.90,  active: false },
  { id: "p-8",  name: "Vestido Floral",               storeId: "seller-demo-4", storeName: "Moda Bahia Saubara",            category: "moda",        price: 129.00, active: true  },
  { id: "p-9",  name: "Calça Jeans Slim",             storeId: "seller-demo-4", storeName: "Moda Bahia Saubara",            category: "moda",        price: 89.00,  active: true  },
  { id: "p-10", name: "Quadro em Macramê",            storeId: "seller-demo-5", storeName: "Arte & Mãos Saubara",           category: "artesanato",  price: 75.00,  active: false },
  { id: "p-11", name: "Caderno Universitário",        storeId: "seller-demo-6", storeName: "Papelaria Saubara",             category: "papelaria",   price: 18.90,  active: true  },
  { id: "p-12", name: "Kit Escola Completo",          storeId: "seller-demo-6", storeName: "Papelaria Saubara",             category: "papelaria",   price: 89.00,  active: true  },
  { id: "p-13", name: "Jogo de Panelas 7 Peças",      storeId: "seller-demo-7", storeName: "Casa & Lar Saubara",            category: "utilidades",  price: 219.00, active: true  },
  { id: "p-14", name: "Smartphone Samsung A15",       storeId: "seller-demo-8", storeName: "Celulares & Acessórios",        category: "celulares",   price: 899.00, active: true  },
  { id: "p-15", name: "Capinha iPhone 14",            storeId: "seller-demo-8", storeName: "Celulares & Acessórios",        category: "celulares",   price: 29.90,  active: true  },
];

// ── Category labels ────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  construcao:  { label: "Construção",   icon: "🏗️", color: "#e67e22" },
  informatica: { label: "Informática",  icon: "💻", color: "#2980b9" },
  celulares:   { label: "Celulares",    icon: "📱", color: "#8e44ad" },
  moda:        { label: "Moda",         icon: "👗", color: "#e91e63" },
  cosmeticos:  { label: "Cosméticos",   icon: "💄", color: "#ff5722" },
  papelaria:   { label: "Papelaria",    icon: "📚", color: "#3498db" },
  utilidades:  { label: "Utilidades",   icon: "🏠", color: "#27ae60" },
  artesanato:  { label: "Artesanato",   icon: "🎨", color: "#f39c12" },
  servicos:    { label: "Serviços",     icon: "🔧", color: "#16a085" },
};
