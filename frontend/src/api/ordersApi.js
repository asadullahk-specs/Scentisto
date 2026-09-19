import { apiClient } from "./apiClient";

function toQueryString(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      usp.set(key, value);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export const ordersApi = {
  create: (token, shippingAddress) =>
    apiClient.post("/orders", { shippingAddress }, token),
  list: (token, params) =>
    apiClient.get(`/orders${toQueryString(params)}`, token),
  get: (token, id) => apiClient.get(`/orders/${id}`, token),
};

export const adminOrdersApi = {
  list: (token, params) =>
    apiClient.get(`/admin/orders${toQueryString(params)}`, token),
  get: (token, id) => apiClient.get(`/admin/orders/${id}`, token),
  updateStatus: (token, id, payload) =>
    apiClient.patch(`/admin/orders/${id}/status`, payload, token),
};
