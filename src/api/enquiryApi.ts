import { apiFetch } from "./client";
import type { BuyerRequest, BuyerRequestStatus } from "./buyerApi";

export const enquiryApi = {
  getEnquiries: () => apiFetch<BuyerRequest[]>("/enquiries"),
  updateStatus: (id: string, status: Exclude<BuyerRequestStatus, "new">) =>
    apiFetch<BuyerRequest>(`/enquiries/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};
