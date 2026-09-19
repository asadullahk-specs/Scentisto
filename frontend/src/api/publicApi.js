/**
 * src/api/publicApi.js
 * Wrappers around apiClient for the public storefront endpoints
 * built in Phase 1 (/api/products, /api/categories, /api/collections).
 * None of these require a token - they're public read-only routes.
 */
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

export const publicProductsApi = {
  list: (params) => apiClient.get(`/products${toQueryString(params)}`),
  getBySlug: (slug) => apiClient.get(`/products/${slug}`),
  sendPresenceHeartbeat: (slug, sessionId) =>
    apiClient.post(`/products/${slug}/presence`, { sessionId }),
};

export const publicCategoriesApi = {
  list: () => apiClient.get(`/categories`),
  getBySlug: (slug) => apiClient.get(`/categories/${slug}`),
};

export const publicCollectionsApi = {
  list: () => apiClient.get(`/collections`),
};

export const publicHomepageApi = {
  get: () => apiClient.get(`/homepage`),
};

export const publicReviewsApi = {
  listForProduct: (slug, params) =>
    apiClient.get(`/reviews/product/${slug}${toQueryString(params)}`),
  create: (token, payload) => apiClient.post(`/reviews`, payload, token),
};

export const publicBlogsApi = {
  list: (params) => apiClient.get(`/blogs${toQueryString(params)}`),
  getBySlug: (slug) => apiClient.get(`/blogs/${slug}`),
};
