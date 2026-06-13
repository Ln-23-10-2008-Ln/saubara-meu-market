import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  unit?: string;
  imageUrl: string;
  storeId: string;
  storeName: string;
  storeWhatsapp: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  totalQty: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  removeStore: (storeId: string) => void;
  isInCart: (id: string) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "saubara_cart";

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  // Persist to localStorage whenever items change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const removeStore = useCallback((storeId: string) => {
    setItems((prev) => prev.filter((i) => i.storeId !== storeId));
  }, []);

  const isInCart = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return (
    <CartContext.Provider value={{ items, totalQty, addItem, removeItem, updateQty, clearCart, removeStore, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
