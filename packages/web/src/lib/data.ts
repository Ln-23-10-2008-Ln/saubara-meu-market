import type { Localidade } from "./auth";

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const categories: Category[] = [
  { id: "construcao",    label: "Construção",         icon: "🔨", color: "bg-stone-100 text-stone-700" },
  { id: "informatica",   label: "Informática",        icon: "💻", color: "bg-indigo-100 text-indigo-700" },
  { id: "celulares",     label: "Celulares",          icon: "📱", color: "bg-blue-100 text-blue-700" },
  { id: "moda",          label: "Moda & Calçados",    icon: "👗", color: "bg-pink-100 text-pink-700" },
  { id: "cosmeticos",    label: "Cosméticos",         icon: "💄", color: "bg-rose-100 text-rose-700" },
  { id: "papelaria",     label: "Papelaria",          icon: "📚", color: "bg-yellow-100 text-yellow-700" },
  { id: "utilidades",    label: "Utilidades",         icon: "🏠", color: "bg-orange-100 text-orange-700" },
  { id: "artesanato",    label: "Artesanato",         icon: "🎨", color: "bg-amber-100 text-amber-700" },
  { id: "servicos",      label: "Serviços",           icon: "🛠️", color: "bg-purple-100 text-purple-700" },
];

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit?: string;
  imageUrl: string;
  featured?: boolean;
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export interface StoreDeliveryConfig {
  ownDelivery?: boolean;     // entrega própria
  pickup?: boolean;          // retirada no local
  deliveryFee?: string;      // ex: "R$ 5,00" ou "Grátis acima de R$ 50"
  estimatedTime?: string;    // ex: "30-60 minutos"
  notes?: string;            // ex: "Entregamos apenas em Saubara"
  serviceArea?: Localidade[]; // localidades atendidas
  deliveryRates?: Partial<Record<Localidade, number>>; // tarifa por localidade em R$ (0=grátis, -1=não atende)
}

export interface Store {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: string;
  whatsapp: string;
  imageUrl: string;   // logo / avatar
  coverUrl: string;
  address: string;
  neighborhood?: string;  // bairro ou localidade em Saubara (display label)
  localidade?: Localidade; // localidade padronizada (slug) onde a loja está
  hours?: string;          // horário de funcionamento
  rating: number;
  featured?: boolean;
  suspended?: boolean;     // true = hidden from customers (expired/suspended subscription)
  verified?: boolean;      // true = loja verificada pela administração
  joinedAt?: string;       // ISO date — data de ingresso na plataforma
  deliveryConfig?: StoreDeliveryConfig;
  products: Product[];
}

export const stores: Store[] = [

  // ── Construção ────────────────────────────────────────────────────────────
  {
    id: "construcao-saubara",
    name: "Material de Construção Saubara",
    description: "Cimento, tintas, ferragens, hidráulica e tudo para sua reforma ou construção.",
    longDescription: "Somos referência em materiais de construção em Saubara. Trabalhamos com as melhores marcas do mercado, oferecendo cimento, tintas, ferragens, hidráulica, elétrica e muito mais. Atendemos desde pequenas reformas até grandes obras, com entrega na cidade e região.",
    category: "construcao",
    whatsapp: "5571991110001",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=70",
    address: "Rodovia BA-001, km 12 — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Seg–Sex: 7h–18h · Sáb: 7h–13h",
    rating: 4.5,
    featured: true,
    verified: true,
    joinedAt: "2023-03-10",
    deliveryConfig: {
      ownDelivery: true,
      pickup: true,
      deliveryFee: "A combinar conforme localidade",
      estimatedTime: "Mesmo dia ou próximo dia útil",
      notes: "Entregamos em Saubara e municípios vizinhos. Cargas grandes têm frete especial.",
      serviceArea: ["sede", "cabucu", "praia-do-sol", "recreio", "pedras-altas", "araripe", "porto", "quiboa", "itapema", "acupe", "condominio-praia-de-itapema"],
    },
    products: [
      {
        id: "cimento-50kg",
        name: "Cimento CP-II — 50kg",
        description: "Alta resistência para lajes e estruturas.",
        price: 42.0,
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=70",
        featured: true,
      },
      {
        id: "tinta-18l",
        name: "Tinta Acrílica — 18L",
        description: "Branco neve, lavável, acabamento fosco.",
        price: 149.0,
        imageUrl: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&q=70",
      },
      {
        id: "tubo-pvc-100",
        name: "Tubo PVC 100mm — 6m",
        description: "Esgoto, cor cinza, norma ABNT.",
        price: 38.0,
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70",
      },
      {
        id: "argamassa-20kg",
        name: "Argamassa AC-II — 20kg",
        description: "Assentamento de cerâmica e porcelanato.",
        price: 19.9,
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=70",
      },
      {
        id: "fio-eletrico",
        name: "Fio Elétrico 2,5mm — 100m",
        description: "Cobre, isolamento duplo, NBR aprovado.",
        price: 189.0,
        imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=70",
      },
    ],
  },

  // ── Informática ───────────────────────────────────────────────────────────
  {
    id: "tech-saubara",
    name: "Tech Saubara",
    description: "Periféricos, acessórios, assistência técnica e suprimentos de informática.",
    longDescription: "A Tech Saubara é o seu centro de tecnologia local. Vendemos periféricos, acessórios e suprimentos de informática, além de oferecer assistência técnica para computadores e notebooks. Atendimento rápido, peças originais e preço justo.",
    category: "informatica",
    whatsapp: "5571991110002",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=70",
    address: "Rua Comercial, 55 — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Seg–Sex: 8h–18h · Sáb: 8h–14h",
    rating: 4.4,
    featured: true,
    verified: true,
    joinedAt: "2023-05-22",
    deliveryConfig: {
      ownDelivery: false,
      pickup: true,
      deliveryFee: "Grátis na retirada",
      estimatedTime: "Disponível no mesmo dia",
      notes: "Retirada disponível em horário comercial. Entregamos apenas em Saubara sede.",
      serviceArea: ["sede"],
    },
    products: [
      {
        id: "mouse-sem-fio",
        name: "Mouse Sem Fio USB",
        description: "1600 DPI, pilha inclusa, compatível Windows/Mac.",
        price: 49.9,
        imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=70",
        featured: true,
      },
      {
        id: "teclado-usb",
        name: "Teclado USB ABNT2",
        description: "Membrana, layout português, plug & play.",
        price: 39.9,
        imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=70",
      },
      {
        id: "pendrive-32gb",
        name: "Pen Drive 32GB USB 3.0",
        description: "Leitura até 80MB/s, compacto e resistente.",
        price: 29.9,
        imageUrl: "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=400&q=70",
      },
      {
        id: "cabo-hdmi",
        name: "Cabo HDMI 2.0 — 2m",
        description: "4K 60Hz, conectores banhados a ouro.",
        price: 24.9,
        imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&q=70",
      },
      {
        id: "hub-usb",
        name: "Hub USB 4 Portas",
        description: "USB 3.0, expansão prática para notebook.",
        price: 44.9,
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=70",
      },
    ],
  },

  // ── Celulares ─────────────────────────────────────────────────────────────
  {
    id: "celulares-saubara",
    name: "Celulares & Acessórios Saubara",
    description: "Capas, películas, carregadores, fones e assistência técnica para celulares.",
    longDescription: "Especialistas em tudo que seu celular precisa. Trabalhamos com acessórios para os principais modelos do mercado, assistência técnica autorizada e peças de qualidade. Troca de tela, bateria, conector e muito mais com garantia.",
    category: "celulares",
    whatsapp: "5571991110003",
    imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=70",
    address: "Rua da Orla, 22 — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Seg–Sex: 9h–18h · Sáb: 9h–13h",
    rating: 4.6,
    verified: true,
    joinedAt: "2023-07-14",
    featured: true,
    deliveryConfig: {
      ownDelivery: false,
      pickup: true,
      deliveryFee: "Grátis na retirada",
      estimatedTime: "No mesmo dia",
      notes: "Retirada na loja. Enviamos por motoboy dentro da sede.",
      serviceArea: ["sede"],
    },
    products: [
      {
        id: "capa-silicone",
        name: "Capa Silicone Anti-Impacto",
        description: "Compatível com principais modelos, várias cores.",
        price: 19.9,
        imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=70",
        featured: true,
      },
      {
        id: "pelicula-vidro",
        name: "Película Vidro Temperado 9H",
        description: "Anti-arranhão, borda curva, cristal.",
        price: 14.9,
        imageUrl: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=70",
      },
      {
        id: "carregador-20w",
        name: "Carregador Rápido 20W USB-C",
        description: "Compatível Android e iPhone, bivolt.",
        price: 34.9,
        imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=70",
      },
      {
        id: "fone-bluetooth",
        name: "Fone Bluetooth TWS",
        description: "Sem fio, até 4h de bateria + case de carga.",
        price: 79.9,
        imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=70",
        featured: true,
      },
      {
        id: "cabo-usb-c",
        name: "Cabo USB-C Trançado — 1m",
        description: "Carga rápida 3A, nylon resistente.",
        price: 22.9,
        imageUrl: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=400&q=70",
      },
    ],
  },

  // ── Moda & Calçados ───────────────────────────────────────────────────────
  {
    id: "moda-litoral",
    name: "Moda Litoral Saubara",
    description: "Roupas casuais, moda praia, calçados e acessórios com estilo costeiro.",
    longDescription: "A Moda Litoral traz o melhor da moda para as areias de Saubara. Peças exclusivas com a identidade da cultura baiana, do artesanato local à moda casual. Roupas, calçados, bijuterias e acessórios para quem vive o litoral com estilo.",
    category: "moda",
    whatsapp: "5571991110004",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=70",
    address: "Av. Beira-Mar, 200 — Saubara, BA",
    neighborhood: "Praia do Sol",
    localidade: "praia-do-sol",
    hours: "Seg–Sáb: 9h–19h · Dom: 10h–15h",
    rating: 4.7,
    verified: true,
    joinedAt: "2023-09-02",
    featured: true,
    deliveryConfig: {
      ownDelivery: true,
      pickup: true,
      deliveryFee: "R$ 5,00",
      estimatedTime: "1–2 horas",
      notes: "Entregamos na Praia do Sol e Sede de Saubara.",
      serviceArea: ["praia-do-sol", "sede"],
    },
    products: [
      {
        id: "canga-praia",
        name: "Canga de Praia — 1,70m",
        description: "Tecido leve 100% algodão, estampas exclusivas.",
        price: 29.9,
        imageUrl: "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=400&q=70",
        featured: true,
      },
      {
        id: "sandalia-couro",
        name: "Sandália de Couro Artesanal",
        description: "Couro legítimo, solado antiderrapante, vários tamanhos.",
        price: 79.9,
        imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=70",
        featured: true,
      },
      {
        id: "chapeu-palha",
        name: "Chapéu de Palha Artesanal",
        description: "Proteção solar, estilo regional baiano.",
        price: 35.0,
        imageUrl: "https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=400&q=70",
      },
      {
        id: "shorts-linho",
        name: "Shorts de Linho Masculino",
        description: "Tecido fresco, cintura elástica, 3 cores.",
        price: 59.9,
        imageUrl: "https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=400&q=70",
      },
    ],
  },

  // ── Cosméticos ────────────────────────────────────────────────────────────
  {
    id: "beleza-saubara",
    name: "Beleza & Cosméticos Saubara",
    description: "Perfumes, maquiagem, cuidados com o cabelo e produtos de beleza em geral.",
    longDescription: "Sua beleza em primeiro lugar! A Beleza & Cosméticos Saubara reúne os melhores produtos de cuidados pessoais, maquiagem, perfumaria e tratamentos capilares. Trabalhamos com marcas reconhecidas e produtos naturais para realçar sua beleza natural.",
    category: "cosmeticos",
    whatsapp: "5571991110005",
    imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=70",
    address: "Rua São Francisco, 18 — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Seg–Sex: 9h–18h · Sáb: 9h–14h",
    rating: 4.6,
    verified: true,
    joinedAt: "2024-01-18",
    featured: false,
    deliveryConfig: {
      ownDelivery: false,
      pickup: true,
      deliveryFee: "Grátis na retirada",
      estimatedTime: "No mesmo dia",
      notes: "Retire na loja ou peça entrega via motoboy particular.",
      serviceArea: ["sede"],
    },
    products: [
      {
        id: "perfume-100ml",
        name: "Perfume Amadeirado — 100ml",
        description: "Fragrância masculina, longa fixação.",
        price: 89.9,
        imageUrl: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=70",
        featured: true,
      },
      {
        id: "shampoo-300ml",
        name: "Shampoo Hidratante — 300ml",
        description: "Para cabelos secos e danificados, sem parabenos.",
        price: 24.9,
        imageUrl: "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400&q=70",
      },
      {
        id: "protetor-solar-fps50",
        name: "Protetor Solar FPS 50+ — 120ml",
        description: "Resistente à água, ideal para praia.",
        price: 38.9,
        imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=70",
        featured: true,
      },
      {
        id: "batom",
        name: "Batom Matte Duradouro",
        description: "12h de fixação, 8 tons disponíveis.",
        price: 19.9,
        imageUrl: "https://images.unsplash.com/photo-1586495777744-4e6b0b5b2a5e?w=400&q=70",
      },
    ],
  },

  // ── Papelaria ─────────────────────────────────────────────────────────────
  {
    id: "papelaria-saubara",
    name: "Papelaria & Livraria Saubara",
    description: "Material escolar, escritório, impressão, encadernação e livros didáticos.",
    longDescription: "Tudo para seus estudos e trabalho em um só lugar. Da papelaria à livraria, oferecemos material escolar completo, suprimentos de escritório, serviços de impressão e encadernação. Atendemos escolas, empresas e estudantes com preço e qualidade.",
    category: "papelaria",
    whatsapp: "5571991110006",
    imageUrl: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=1200&q=70",
    address: "Rua Coronel Lima, 14 — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Seg–Sex: 7h30–18h · Sáb: 7h30–13h",
    rating: 4.5,
    featured: false,
    verified: true,
    joinedAt: "2024-08-01",
    deliveryConfig: {
      ownDelivery: false,
      pickup: true,
      deliveryFee: "Grátis na retirada",
      estimatedTime: "Imediato",
      notes: "Retirada no balcão. Atendemos escolas da sede.",
      serviceArea: ["sede"],
    },
    products: [
      {
        id: "caderno-200fls",
        name: "Caderno Espiral 200 Folhas",
        description: "Capa dura, pautado, tamanho A4.",
        price: 22.9,
        imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=70",
        featured: true,
      },
      {
        id: "kit-canetas",
        name: "Kit Canetas Coloridas — 12un",
        description: "Ponta fina, cores vibrantes, secagem rápida.",
        price: 14.9,
        imageUrl: "https://images.unsplash.com/photo-1579820010410-c10411aaaa88?w=400&q=70",
      },
      {
        id: "mochila-escolar",
        name: "Mochila Escolar 30L",
        description: "Resistente, compartimentos múltiplos, 3 cores.",
        price: 89.9,
        imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=70",
        featured: true,
      },
      {
        id: "resma-papel",
        name: "Resma de Papel A4 — 500fls",
        description: "75g/m², brancura máxima, pacote lacrado.",
        price: 32.9,
        imageUrl: "https://images.unsplash.com/photo-1568667256549-094345857637?w=400&q=70",
      },
    ],
  },

  // ── Utilidades Domésticas ─────────────────────────────────────────────────
  {
    id: "utilidades-saubara",
    name: "Casa & Utilidades Saubara",
    description: "Utensílios de cozinha, organização, limpeza e decoração para o lar.",
    longDescription: "O lar perfeito começa com os produtos certos. A Casa & Utilidades Saubara oferece tudo para sua casa: utensílios de cozinha, produtos de limpeza, organização e decoração. Qualidade e praticidade para o dia a dia da família saubarense.",
    category: "utilidades",
    whatsapp: "5571991110007",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=70",
    address: "Av. Principal, 77 — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Seg–Sex: 8h–18h · Sáb: 8h–14h",
    rating: 4.4,
    verified: true,
    joinedAt: "2024-03-20",
    featured: false,
    deliveryConfig: {
      ownDelivery: true,
      pickup: true,
      deliveryFee: "R$ 5,00",
      estimatedTime: "1–3 horas",
      notes: "Entregamos na sede e bairros próximos.",
      serviceArea: ["sede"],
    },
    products: [
      {
        id: "jogo-panelas",
        name: "Jogo de Panelas Antiaderente — 5pc",
        description: "Alumínio com revestimento antiaderente, cabo baquelite.",
        price: 129.9,
        imageUrl: "https://images.unsplash.com/photo-1584990347449-a5d9f800a783?w=400&q=70",
        featured: true,
      },
      {
        id: "organizador-gaveta",
        name: "Organizador de Gaveta — 6 div.",
        description: "Plástico resistente, modular, encaixe fácil.",
        price: 24.9,
        imageUrl: "https://images.unsplash.com/photo-1558171813-ce38f4aa4e1f?w=400&q=70",
      },
      {
        id: "vassoura-cabo",
        name: "Vassoura com Cabo — 1,40m",
        description: "Cerdas macias, cabo reforçado, multiuso.",
        price: 18.9,
        imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=70",
      },
      {
        id: "lixeira-20l",
        name: "Lixeira com Tampa — 20L",
        description: "Pedal, plástico resistente, higienização fácil.",
        price: 39.9,
        imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=70",
        featured: true,
      },
    ],
  },

  // ── Artesanato ────────────────────────────────────────────────────────────
  {
    id: "atelie-saubara",
    name: "Ateliê Artesanal de Saubara",
    description: "Peças únicas feitas por artesãos locais: cerâmica, renda, bordado e bijuteria.",
    longDescription: "Preservamos a cultura artesanal de Saubara. Cada peça é criada com amor pelas mãos de artesãos locais — ceramistas, rendeiras, bordadeiras e ourives. Aqui você encontra lembranças únicas que carregam a alma da nossa cidade.",
    category: "artesanato",
    whatsapp: "5571991110008",
    imageUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=70",
    address: "Centro Histórico — Saubara, BA",
    neighborhood: "Sede de Saubara",
    localidade: "sede",
    hours: "Ter–Dom: 9h–17h · Segunda: fechado",
    rating: 4.9,
    featured: true,
    verified: true,
    joinedAt: "2024-06-10",
    deliveryConfig: {
      ownDelivery: false,
      pickup: true,
      deliveryFee: "Grátis na retirada",
      estimatedTime: "Peça sob encomenda em 3–7 dias",
      notes: "Enviamos para toda Saubara. Encomendas via WhatsApp.",
      serviceArea: ["sede", "cabucu", "praia-do-sol", "recreio", "pedras-altas", "araripe", "porto", "quiboa", "itapema", "acupe", "condominio-praia-de-itapema"],
    },
    products: [
      {
        id: "vaso-ceramica",
        name: "Vaso Cerâmico Artesanal",
        description: "Pintado à mão, peça exclusiva de Saubara.",
        price: 55.0,
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=70",
        featured: true,
      },
      {
        id: "renda-file",
        name: "Renda Filé — 50cm",
        description: "Técnica centenária da Bahia, feita à mão.",
        price: 45.0,
        imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=70",
        featured: true,
      },
      {
        id: "colar-conchas",
        name: "Colar de Conchas Naturais",
        description: "Feito com conchas da praia de Saubara.",
        price: 28.0,
        imageUrl: "https://images.unsplash.com/photo-1611923134239-b9be5816b3b4?w=400&q=70",
      },
      {
        id: "quadro-madeira",
        name: "Quadro Decorativo em Madeira",
        description: "Entalhado à mão, paisagens de Saubara.",
        price: 75.0,
        imageUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=70",
      },
    ],
  },

  // ── Serviços ──────────────────────────────────────────────────────────────
  {
    id: "servicos-saubara",
    name: "Serviços & Reparos Saubara",
    description: "Eletricista, encanador, pintor, pedreiro e diarista — contrate pelo WhatsApp.",
    longDescription: "Profissionais de confiança para todos os serviços da sua casa. Eletricistas, encanadores, pintores, pedreiros e diaristas prontos para atender. Orçamento sem compromisso, atendimento rápido e qualidade garantida em toda Saubara.",
    category: "servicos",
    whatsapp: "5571991110009",
    imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=70",
    address: "Atendimento em toda Saubara, BA",
    neighborhood: "Toda Saubara",
    localidade: "sede",
    hours: "Seg–Sáb: 7h–18h · Emergências: a combinar",
    rating: 4.5,
    verified: true,
    joinedAt: "2024-08-01",
    featured: false,
    deliveryConfig: {
      ownDelivery: true,
      pickup: false,
      deliveryFee: "Incluso no serviço",
      estimatedTime: "Agendamento via WhatsApp",
      notes: "Atendemos toda Saubara e distritos.",
      serviceArea: ["sede", "cabucu", "praia-do-sol", "recreio", "pedras-altas", "araripe", "porto", "quiboa", "itapema", "acupe", "condominio-praia-de-itapema"],
    },
    products: [
      {
        id: "eletricista",
        name: "Eletricista Residencial",
        description: "Instalação, reparo e laudo elétrico.",
        price: 80.0,
        unit: "visita",
        imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=70",
        featured: true,
      },
      {
        id: "pedreiro",
        name: "Pedreiro / Servente",
        description: "Reformas, construções e acabamentos em geral.",
        price: 120.0,
        unit: "diária",
        imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=70",
      },
      {
        id: "pintor",
        name: "Pintor Residencial",
        description: "Pintura interna e externa, massa corrida inclusa.",
        price: 110.0,
        unit: "diária",
        imageUrl: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&q=70",
      },
    ],
  },

  // ── Itapema ───────────────────────────────────────────────────────────────
  {
    id: "mercadinho-itapema",
    name: "Mercadinho Itapema",
    description: "Mercadinho de bairro com produtos frescos, bebidas e itens de primeira necessidade.",
    longDescription: "Atendemos a comunidade de Itapema com produtos frescos, hortifrúti, bebidas e itens básicos do dia a dia. Entrega rápida dentro da localidade.",
    category: "utilidades",
    whatsapp: "5571991110020",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=70",
    address: "Rua Principal s/n — Itapema, Saubara, BA",
    neighborhood: "Itapema",
    localidade: "itapema",
    hours: "Seg–Sáb: 7h–20h · Dom: 8h–14h",
    rating: 4.3,
    featured: false,
    verified: true,
    joinedAt: "2024-06-01",
    deliveryConfig: {
      ownDelivery: true,
      pickup: true,
      deliveryFee: "R$ 3,00",
      estimatedTime: "20-40 minutos",
      notes: "Entregamos em Itapema e redondezas.",
      serviceArea: ["itapema"],
      deliveryRates: { "itapema": 3, "sede": 8, "acupe": 10 },
    },
    products: [
      {
        id: "arroz-itapema",
        name: "Arroz Tipo 1 — 5kg",
        description: "Arroz branco tipo 1, grão longo, cozimento perfeito.",
        price: 28.90,
        imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=70",
        featured: true,
      },
      {
        id: "feijao-itapema",
        name: "Feijão Carioca — 1kg",
        description: "Feijão carioca selecionado.",
        price: 9.90,
        imageUrl: "https://images.unsplash.com/photo-1590239926044-4131f5d0654d?w=400&q=70",
      },
      {
        id: "agua-itapema",
        name: "Água Mineral — 20L",
        description: "Galão de água mineral natural.",
        price: 12.00,
        unit: "galão",
        imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=70",
      },
    ],
  },

  // ── Acupe ─────────────────────────────────────────────────────────────────
  {
    id: "peixaria-acupe",
    name: "Peixaria do Acupe",
    description: "Frutos do mar frescos direto dos pescadores locais. Camarão, peixe e mariscos.",
    longDescription: "Trabalhamos com frutos do mar frescos todos os dias, vindos direto dos pescadores de Acupe. Camarão, siri, peixe e mariscos com o sabor da Bahia.",
    category: "utilidades",
    whatsapp: "5571991110021",
    imageUrl: "https://images.unsplash.com/photo-1534082421329-c33f7e26dd23?w=600&q=70",
    coverUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=1200&q=70",
    address: "Orla de Acupe s/n — Acupe, Santo Amaro, BA",
    neighborhood: "Acupe",
    localidade: "acupe",
    hours: "Seg–Dom: 5h–14h",
    rating: 4.8,
    featured: true,
    verified: true,
    joinedAt: "2024-05-15",
    deliveryConfig: {
      ownDelivery: true,
      pickup: true,
      deliveryFee: "R$ 5,00",
      estimatedTime: "30-60 minutos",
      notes: "Entregamos em Acupe, Itapema e Sede de Saubara.",
      serviceArea: ["acupe", "itapema", "sede"],
      deliveryRates: { "acupe": 0, "itapema": 5, "sede": 8 },
    },
    products: [
      {
        id: "camaro-acupe",
        name: "Camarão Fresco — 1kg",
        description: "Camarão fresco pescado no dia, limpo e higienizado.",
        price: 55.00,
        unit: "kg",
        imageUrl: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&q=70",
        featured: true,
      },
      {
        id: "peixe-vermelho-acupe",
        name: "Peixe Vermelho — 1kg",
        description: "Peixe vermelho fresco, ideal para moqueca.",
        price: 38.00,
        unit: "kg",
        imageUrl: "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&q=70",
        featured: true,
      },
      {
        id: "siri-acupe",
        name: "Siri Catado — 200g",
        description: "Siri catado fresco, pronto para o preparo.",
        price: 22.00,
        unit: "200g",
        imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&q=70",
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Active stores only — suspended stores are hidden from all customer-facing pages. */
export const activeStores = stores.filter((s) => !s.suspended);

export const featuredStores = activeStores.filter((s) => s.featured);

export const featuredProducts: Array<
  Product & { storeName: string; storeId: string; storeWhatsapp: string }
> = activeStores.flatMap((s) =>
  s.products
    .filter((p) => p.featured)
    .map((p) => ({ ...p, storeName: s.name, storeId: s.id, storeWhatsapp: s.whatsapp }))
);

/** Filter active stores by localidade (sede, cabucu, etc.).
 *  Matches stores whose `localidade` OR `serviceArea` includes the given localidade. */
export function getStoresByLocalidade(localidade: Localidade): Store[] {
  return activeStores.filter((s) => {
    if (s.localidade === localidade) return true;
    if (s.deliveryConfig?.serviceArea?.includes(localidade)) return true;
    return false;
  });
}

/** All products in active stores filtered by serviceArea localidade. */
export function getProductsByLocalidade(
  localidade: Localidade
): Array<Product & { storeName: string; storeId: string; storeWhatsapp: string }> {
  return getStoresByLocalidade(localidade).flatMap((s) =>
    s.products.map((p) => ({ ...p, storeName: s.name, storeId: s.id, storeWhatsapp: s.whatsapp }))
  );
}
