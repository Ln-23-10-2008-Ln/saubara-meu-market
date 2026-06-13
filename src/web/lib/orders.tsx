import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"       // aguardando confirmação da loja
  | "confirmed"     // loja confirmou
  | "preparing"     // em preparo
  | "out_delivery"  // saiu para entrega
  | "delivered"     // entregue
  | "cancelled";    // cancelado

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
  clientName?: string;   // nome do cliente no momento do pedido
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

// ─── Storage ──────────────────────────────────────────────────────────────────

const ORDERS_KEY = "smm_orders";

function loadOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">): Order {
  const now = new Date().toISOString();
  const order: Order = {
    ...data,
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  const existing = loadOrders();
  persistOrders([order, ...existing]);
  return order;
}

export function getOrdersByClient(clientId: string): Order[] {
  return loadOrders().filter((o) => o.clientId === clientId);
}

export function getOrdersByStore(storeId: string): Order[] {
  return loadOrders().filter((o) => o.storeId === storeId);
}

export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const orders = loadOrders();
  persistOrders(
    orders.map((o) =>
      o.id === orderId
        ? { ...o, status, updatedAt: new Date().toISOString() }
        : o
    )
  );
}

export function getOrderStats(clientId?: string) {
  const orders = clientId
    ? loadOrders().filter((o) => o.clientId === clientId)
    : loadOrders();
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    active: orders.filter((o) => ["confirmed", "preparing", "out_delivery"].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    totalSpent: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0),
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface OrdersContextValue {
  orders: Order[];
  refresh: () => void;
  create: (data: Omit<Order, "id" | "createdAt" | "updatedAt">) => Order;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  getByClient: (clientId: string) => Order[];
  getByStore: (storeId: string) => Order[];
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const refresh = useCallback(() => {
    setOrders(loadOrders());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback((data: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    const order = createOrder(data);
    refresh();
    return order;
  }, [refresh]);

  const updateStatus = useCallback((orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    refresh();
  }, [refresh]);

  const getByClient = useCallback((clientId: string) => {
    return orders.filter((o) => o.clientId === clientId);
  }, [orders]);

  const getByStore = useCallback((storeId: string) => {
    return orders.filter((o) => o.storeId === storeId);
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
