import { apiFetch } from "./client";

export type OrderStatus = "pending" | "confirmed" | "shipped" | "completed" | "cancelled";

export type Order = {
  id: string;
  product_id: string | null;
  product: string;
  product_name: string;
  buyer_name: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  created_at: string;
};

export const orderApi = {
  getOrders: () => apiFetch<Order[]>("/orders"),
  updateStatus: (id: string, status: OrderStatus) =>
    apiFetch<Order>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
};