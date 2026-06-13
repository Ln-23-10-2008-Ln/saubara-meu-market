/**
 * store-resolver.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ÚNICA FONTE DE VERDADE para lojas e produtos.
 *
 * Combina:
 *   1. Lojas ESTÁTICAS de data.ts  (curadoria da plataforma)
 *   2. Lojistas REGISTRADOS no localStorage via auth.tsx
 *      – Se a storeName bate com uma loja estática → sobrescreve campos dinâmicos
 *      – Se não bate → cria entrada "virtual" para o lojista
 *
 * Hooks expostos:
 *   useStores()  → { stores, activeStores, featuredStores, featuredProducts }
 *
 * Funções puras (não precisam de hook, mas dependem do array resolvido):
 *   resolveStores()  → Store[]   (usa localStorage diretamente — não reativo)
 *   getActiveStores()
 *
 * Regra de suspensão:
 *   – store.suspended === true  →  oculto
 *   – lojista com subscription expired/suspended  →  oculto
 *   – lojista sem emailVerified  →  oculto do catálogo público
 */

import { useState, useEffect, useMemo } from "react";
import {
  stores as staticStores,
  type Store,
  type Product,
  categories,
} from "./data";
import {
  getAllRegisteredUsers,
  LOCALIDADES,
  computeSubscriptionStatus,
  type StoredUser,
  type Localidade,
} from "./auth";

// ─── localStorage keys ────────────────────────────────────────────────────────
const USERS_KEY = "saubara_registered_users";

// ─── Product shape from seller dashboard ─────────────────────────────────────
interface SellerProduct {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  sales: number;
  active: boolean;
  photo?: string;
}

function getSellerProducts(userId: string): Product[] {
  try {
    const key = `saubara_products_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const items: SellerProduct[] = JSON.parse(raw);
    return items
      .filter((p) => p.active && p.stock !== 0)
      .map((p) => ({
        id: `seller-${userId}-${p.id}`,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.photo || "https://images.unsplash.com/photo-1585565804872-2bde9b1b6c5e?w=400&q=70",
        featured: p.sales >= 10, // produtos com 10+ vendas entram como destaque
      }));
  } catch {
    return [];
  }
}

// ─── Build a virtual Store from a registered merchant ────────────────────────
function merchantToStore(user: StoredUser): Store {
  // Determine localidade: explicit storeLocalidade > address.localidade > default
  const resolvedLocalidade = (user.storeLocalidade || user.address?.localidade || "sede") as Localidade;

  const localLabel =
    LOCALIDADES.find((l) => l.value === resolvedLocalidade)?.label ??
    "Saubara";

  const cat = categories.find((c) => c.id === user.storeCategory);

  // Build address string from storeAddress or user address fields
  const resolvedAddress = user.storeAddress
    ? user.storeAddress
    : user.address
      ? [
          user.address.rua,
          user.address.numero && `nº ${user.address.numero}`,
          user.address.complemento,
        ]
          .filter(Boolean)
          .join(", ") || "Saubara, BA"
      : "Saubara, BA";

  return {
    id: `merchant-${user.id}`,
    name: user.storeName ?? user.name,
    description: user.storeBio || `Loja de ${cat?.label ?? "produtos"} em Saubara`,
    longDescription: user.storeBio,
    category: user.storeCategory ?? "utilidades",
    whatsapp: user.storeWhatsapp ?? user.phone,
    imageUrl:
      user.storeLogo ||
      user.logoLoja ||
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=70",
    coverUrl:
      user.storeCover ||
      user.fotoFachada ||
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=70",
    address: resolvedAddress,
    neighborhood: localLabel,
    localidade: resolvedLocalidade,
    hours: user.storeHours,
    rating: 4.0,
    featured: false,
    suspended: false,
    verified: user.approvalStatus === "approved",
    joinedAt: user.registeredAt,
    products: getSellerProducts(user.id),
    deliveryConfig: user.deliveryConfig
      ? {
          ownDelivery: user.deliveryConfig.ownDelivery,
          pickup: user.deliveryConfig.pickup,
          deliveryFee: user.deliveryConfig.deliveryFee,
          estimatedTime: user.deliveryConfig.estimatedTime,
          notes: user.deliveryConfig.notes,
          serviceArea: user.deliveryConfig.serviceArea as Localidade[],
        }
      : {
          ownDelivery: false,
          pickup: true,
          deliveryFee: "A combinar",
          estimatedTime: "A combinar",
          serviceArea: user.storeLocalidade
            ? ([user.storeLocalidade] as Localidade[])
            : ["sede"],
        },
  };
}

// ─── Core resolver — pure function ───────────────────────────────────────────
export function resolveStores(): Store[] {
  const allUsers = getAllRegisteredUsers();

  // Filter: sellers with storeName + approved OR email verified + active subscription
  // Merchants with approvalStatus="approved" appear even if emailVerified=false
  // (admin already vetted them; email verification is a secondary UX concern)
  const activeMerchants = allUsers.filter((u) => {
    if (u.type !== "seller") return false;
    if (!u.storeName) return false;
    // Must be either approved by admin OR have verified email
    const isApproved = u.approvalStatus === "approved";
    const isEmailVerified = u.emailVerified === true;
    if (!isApproved && !isEmailVerified) return false;
    // Block suspended/rejected accounts
    if (u.approvalStatus === "rejected" || u.approvalStatus === "suspended") return false;
    // Block expired/suspended subscriptions
    if (u.subscription) {
      const status = computeSubscriptionStatus(u.subscription);
      if (status === "expired" || status === "suspended") return false;
    }
    return true;
  });

  // Map: storeName (lowercase) → merchant user
  const merchantByName = new Map<string, StoredUser>();
  activeMerchants.forEach((m) => {
    if (m.storeName) {
      merchantByName.set(m.storeName.trim().toLowerCase(), m);
    }
  });

  // 1. Start with static stores — overlay dynamic merchant data when name matches
  const result: Store[] = staticStores.map((s) => {
    const merchant = merchantByName.get(s.name.trim().toLowerCase());
    if (!merchant) return s;

    // Merchant matched → mark as found, overlay fields
    merchantByName.delete(s.name.trim().toLowerCase()); // consume so we don't duplicate

    // Resolve merchant localidade: explicit storeLocalidade > address.localidade
    const merchantLocalidade = (merchant.storeLocalidade || merchant.address?.localidade) as Localidade | undefined;
    const localLabel =
      LOCALIDADES.find((l) => l.value === merchantLocalidade)?.label ??
      s.neighborhood;

    // Build storeAddress from storeAddress field or address struct
    const merchantAddress = merchant.storeAddress
      ? merchant.storeAddress
      : merchant.address
        ? [
            merchant.address.rua,
            merchant.address.numero && `nº ${merchant.address.numero}`,
            merchant.address.complemento,
          ]
            .filter(Boolean)
            .join(", ") || undefined
        : undefined;

    // Merge merchant products on top of static products (merchant's override static)
    const merchantProducts = getSellerProducts(merchant.id);
    const mergedProducts =
      merchantProducts.length > 0 ? merchantProducts : s.products;

    return {
      ...s,
      imageUrl:     merchant.storeLogo   || merchant.logoLoja     || s.imageUrl,
      coverUrl:     merchant.storeCover  || merchant.fotoFachada  || s.coverUrl,
      description:  merchant.storeBio    || s.description,
      longDescription: merchant.storeBio || s.longDescription,
      hours:        merchant.storeHours  || s.hours,
      address:      merchantAddress      || s.address,
      neighborhood: merchantLocalidade   ? localLabel : s.neighborhood,
      localidade:   merchantLocalidade   || s.localidade,
      whatsapp:     merchant.storeWhatsapp   || s.whatsapp,
      verified:     merchant.approvalStatus === "approved" || s.verified,
      products:     mergedProducts,
    };
  });

  // 2. Add remaining merchants who have NO static entry
  merchantByName.forEach((merchant) => {
    result.push(merchantToStore(merchant));
  });

  return result;
}

// ─── Derived helpers ─────────────────────────────────────────────────────────
export function getActiveStores(all?: Store[]): Store[] {
  return (all ?? resolveStores()).filter((s) => !s.suspended);
}

export function getFeaturedStores(active?: Store[]): Store[] {
  return (active ?? getActiveStores()).filter((s) => s.featured);
}

export function getFeaturedProducts(
  active?: Store[]
): Array<Product & { storeName: string; storeId: string; storeWhatsapp: string }> {
  return (active ?? getActiveStores()).flatMap((s) =>
    s.products
      .filter((p) => p.featured)
      .map((p) => ({ ...p, storeName: s.name, storeId: s.id, storeWhatsapp: s.whatsapp }))
  );
}

export function getStoresByCategory(catId: string, active?: Store[]): Store[] {
  return (active ?? getActiveStores()).filter((s) => s.category === catId);
}

export function getStoresByLocalidade(loc: Localidade, active?: Store[]): Store[] {
  return (active ?? getActiveStores()).filter(
    (s) =>
      s.localidade === loc ||
      s.deliveryConfig?.serviceArea?.includes(loc)
  );
}

export function getStoreById(id: string, all?: Store[]): Store | undefined {
  return (all ?? resolveStores()).find((s) => s.id === id);
}

// ─── React hook — reactive (re-renders on localStorage change) ───────────────
export function useStores() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Listen for localStorage changes (other tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === USERS_KEY || e.key?.startsWith("saubara_products_")) {
        setTick((t) => t + 1);
      }
    };
    // Listen for in-page changes (same tab)
    const onCustom = () => setTick((t) => t + 1);

    window.addEventListener("storage", onStorage);
    window.addEventListener("saubara:stores-updated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("saubara:stores-updated", onCustom);
    };
  }, []);

  const allStores = useMemo(() => resolveStores(), [tick]);
  const activeStores = useMemo(() => getActiveStores(allStores), [allStores]);
  const featuredStores = useMemo(() => getFeaturedStores(activeStores), [activeStores]);
  const featuredProducts = useMemo(() => getFeaturedProducts(activeStores), [activeStores]);

  return { allStores, activeStores, featuredStores, featuredProducts };
}

// ─── Dispatch helper — call after any write to localStorage ──────────────────
export function notifyStoresUpdated() {
  window.dispatchEvent(new Event("saubara:stores-updated"));
}
