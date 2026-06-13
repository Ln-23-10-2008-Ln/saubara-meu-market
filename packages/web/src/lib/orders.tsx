import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  unit?: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName?: string;
  storeId: string;
  storeName: string;
  storeWhatsapp: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  localidade: string;
  address?: string;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:      "Aguardando confirmação",
  confirmed:    "Confirmado",
  preparing:    "Em preparo",
  out_delivery: "Saiu para entrega",
  delivered:    "Entregue",
  cancelled:    "Cancelado",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending:      "bg-yellow-100 text-yellow-700",
  confirmed:    "bg-blue-100 text-blue-700",
  preparing:    "bg-orange-100 text-orange-700",
  out_delivery: "bg-purple-100 text-purple-700",
  delivered:    "bg-green-100 text-green-700",
  cancelled:    "bg-red-100 text-red-700",
};

// ─── API base ─────────────────────────────────────────────────────────────────
const API = "/api/orders";

// ─── localStorage fallback keys ───────────────────────────────────────────────
const ORDERS_KEY = "smm_orders";

function lsLoad(): Order[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"); } catch { return []; }
}
function lsSave(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

// Merge backend orders with local fallback (dedup by id, backend wins)
function mergeOrders(backend: Order[], local: Order[]): Order[] {
  const map = new Map<string, Order>();
  local.forEach(o => map.set(o.id, o));
  backend.forEach(o => map.set(o.id, o)); // backend wins on conflict
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── camelCase mapper from backend snake_case ─────────────────────────────────
function mapOrder(raw: any): Order {
  return {
    id:           raw.id,
    clientId:     raw.client_id   ?? raw.clientId   ?? "",
    clientName:   raw.client_name ?? raw.clientName ?? undefined,
    storeId:      raw.store_id    ?? raw.storeId    ?? "",
    storeName:    raw.store_name  ?? raw.storeName  ?? "",
    storeWhatsapp: raw.store_whatsapp ?? raw.storeWhatsapp ?? "",
    items:        Array.isArray(raw.items) ? raw.items : (() => {
      try { return JSON.parse(raw.items_json ?? "[]"); } catch { return []; }
    })(),
    subtotal:     parseFloat(raw.subtotal   ?? "0"),
    deliveryFee:  parseFloat(raw.delivery_fee ?? raw.deliveryFee ?? "0"),
    total:        parseFloat(raw.total      ?? "0"),
    localidade:   raw.localidade  ?? "",
    address:      raw.address     ?? undefined,
    notes:        raw.notes       ?? undefined,
    status:       (raw.status ?? "pending") as OrderStatus,
    createdAt:    raw.created_at  ?? raw.createdAt  ?? new Date().toISOString(),
    updatedAt:    raw.updated_at  ?? raw.updatedAt  ?? new Date().toISOString(),
  };
}

// ─── Public helpers (backend-first, localStorage fallback) ───────────────────

export async function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
  // Attempt backend
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        clientId:      data.clientId,
        clientName:    data.clientName,
        storeId:       data.storeId,
        storeName:     data.storeName,
        storeWhatsapp: data.storeWhatsapp,
        items:         data.items,
        subtotal:      data.subtotal,
        deliveryFee:   data.deliveryFee,
        total:         data.total,
        localidade:    data.localidade,
        address:       data.address,
        notes:         data.notes,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const order: Order = { ...data, id: json.id, createdAt: json.createdAt, updatedAt: json.createdAt };
      // Also persist locally as offline cache
      lsSave([order, ...lsLoad()]);
      return order;
    }
  } catch { /* offline — fall through */ }

  // localStorage fallback
  const now = new Date().toISOString();
  const order: Order = {
    ...data,
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  lsSave([order, ...lsLoad()]);
  return order;
}

export async function getOrdersByClient(clientId: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API}?clientId=${encodeURIComponent(clientId)}&limit=100`, {
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      const backendOrders: Order[] = (json.orders ?? []).map(mapOrder);
      const merged = mergeOrders(backendOrders, lsLoad().filter(o => o.clientId === clientId));
      return merged;
    }
  } catch { /* offline */ }
  return lsLoad().filter(o => o.clientId === clientId);
}

export async function getOrdersByStore(storeId: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API}?storeId=${encodeURIComponent(storeId)}&limit=200`, {
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      return (json.orders ?? []).map(mapOrder);
    }
  } catch { /* offline */ }
  return lsLoad().filter(o => o.storeId === storeId);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  try {
    const res = await fetch(`${API}/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      // Sync to localStorage cache
      lsSave(lsLoad().map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
      return;
    }
  } catch { /* offline */ }
  // localStorage fallback
  lsSave(lsLoad().map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
}

export async function getOrderStats(clientId?: string) {
  const all = clientId ? await getOrdersByClient(clientId) : lsLoad();
  return {
    total:      all.length,
    pending:    all.filter(o => o.status === "pending").length,
    active:     all.filter(o => ["confirmed", "preparing", "out_delivery"].includes(o.status)).length,
    delivered:  all.filter(o => o.status === "delivered").length,
    cancelled:  all.filter(o => o.status === "cancelled").length,
    totalSpent: all.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface OrdersContextValue {
  orders: Order[];
  refresh: () => void;
  create: (data: Omit<Order, "id" | "createdAt" | "updatedAt">) => Promise<Order>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getByClient: (clientId: string) => Order[];
  getByStore:  (storeId:  string) => Order[];
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const refresh = useCallback(() => {
    // Optimistic: load localStorage immediately
    setOrders(lsLoad());
    // Then sync backend
    fetch(`${API}?limit=200`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.orders) {
          const merged = mergeOrders(json.orders.map(mapOrder), lsLoad());
          setOrders(merged);
          lsSave(merged);
        }
      })
      .catch(() => { /* keep localStorage */ });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    const order = await createOrder(data);
    refresh();
    return order;
  }, [refresh]);

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    refresh();
  }, [refresh]);

  const getByClient = useCallback((clientId: string) => {
    return orders.filter(o => o.clientId === clientId);
  }, [orders]);

  const getByStore = useCallback((storeId: string) => {
    return orders.filter(o => o.storeId === storeId);
  }, [orders]);

  return (
    <OrdersContext.Provider value={{ orders, refresh, create, updateStatus, getByClient, getByStore }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
