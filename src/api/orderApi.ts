import { apiFetch } from "./client";

export type OrderStatus = "pending" | "confirmed" | "shipped" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "submitted" | "verified" | "rejected";

export type Order = {
  id: string;
  product_id: string | null;
  product: string;
  product_name: string;
  buyer_name: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_utr: string;
  payment_screenshot: string;
  merchant_qr_url?: string;
  created_at: string;
};

export const orderApi = {
  getOrders: () => apiFetch<Order[]>("/orders"),
  updateStatus: (id: string, status: OrderStatus) =>
    apiFetch<Order>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  updatePaymentStatus: (id: string, payment_status: PaymentStatus) =>
    apiFetch<Order>(`/orders/${id}/payment`, {
      method: "PUT",
      body: JSON.stringify({ payment_status }),
    }),
};