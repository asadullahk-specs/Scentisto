import { apiClient } from "./apiClient";

export const cartApi = {
  get: (token) => apiClient.get("/cart", token),
  addItem: (token, payload) => apiClient.post("/cart/items", payload, token),
  updateItem: (token, itemId, quantity) =>
    apiClient.put(`/cart/items/${itemId}`, { quantity }, token),
  removeItem: (token, itemId) =>
    apiClient.delete(`/cart/items/${itemId}`, token),
  merge: (token, items) => apiClient.post("/cart/merge", { items }, token),
};
