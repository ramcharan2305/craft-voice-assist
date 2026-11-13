import { apiFetch } from "./client";
import type { BuyerRequest, BuyerRequestStatus } from "./buyerApi";

export type BuyerEnquiry = Omit<BuyerRequest, "status"> & { status: BuyerRequestStatus };

export const enquiryApi = {
  getEnquiries: () => apiFetch<BuyerEnquiry[]>("/enquiries"),
  updateStatus: (id: string, status: Exclude<BuyerRequestStatus, "new">) =>
    apiFetch<BuyerEnquiry>(`/enquiries/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};
