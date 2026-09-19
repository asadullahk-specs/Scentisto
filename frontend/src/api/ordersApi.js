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
  // Order creation is the one request that must never be retried
  // automatically - a retry after a response is lost would place a
  // second order. apiClient only ever retries GETs, so this is safe
  // by construction; the longer timeout is because this runs a
  // multi-document transaction (stock reservation + order write) and
  // a cold serverless start on top of that can legitimately take a
  // while. If it does time out, the customer sees an explicit error
  // rather than a silent failure.
  create: (token, shippingAddress) =>
    apiClient.post("/orders", { shippingAddress }, token, {
      timeoutMs: 30000,
    }),
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
