import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FavProduct {
  id: string;
  storeId: string;
  name: string;
  price: number;
  imageUrl: string;
  storeName: string;
}

interface FavoritesState {
  stores: string[];        // store IDs
  products: FavProduct[];  // full product info
}

interface FavoritesContextValue {
  favStoreIds: string[];
  favProducts: FavProduct[];
  isStoreFav: (id: string) => boolean;
  isProductFav: (id: string) => boolean;
  toggleStore: (id: string) => void;
  toggleProduct: (product: FavProduct) => void;
  totalFavs: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "saubara_favorites";

function storageKey(userId?: string) {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

function load(userId?: string): FavoritesState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { stores: [], products: [] };
}

function save(state: FavoritesState, userId?: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<FavoritesState>(() => load(user?.id));

  // Reload when user changes (login/logout)
  useEffect(() => {
    setState(load(user?.id));
  }, [user?.id]);

  const update = useCallback((next: FavoritesState) => {
    setState(next);
    save(next, user?.id);
  }, [user?.id]);

  const isStoreFav = useCallback((id: string) => state.stores.includes(id), [state.stores]);
  const isProductFav = useCallback((id: string) => state.products.some((p) => p.id === id), [state.products]);

  const toggleStore = useCallback((id: string) => {
    const next: FavoritesState = isStoreFav(id)
      ? { ...state, stores: state.stores.filter((s) => s !== id) }
      : { ...state, stores: [...state.stores, id] };
    update(next);
  }, [state, isStoreFav, update]);

  const toggleProduct = useCallback((product: FavProduct) => {
    const next: FavoritesState = isProductFav(product.id)
      ? { ...state, products: state.products.filter((p) => p.id !== product.id) }
      : { ...state, products: [...state.products, product] };
    update(next);
  }, [state, isProductFav, update]);

  return (
    <FavoritesContext.Provider value={{
      favStoreIds: state.stores,
      favProducts: state.products,
      isStoreFav,
      isProductFav,
      toggleStore,
      toggleProduct,
      totalFavs: state.stores.length + state.products.length,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
