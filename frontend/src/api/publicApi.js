/**
 * src/api/publicApi.js
 * Wrappers around apiClient for the public storefront endpoints
 * built in Phase 1 (/api/products, /api/categories, /api/collections).
 * None of these require a token - they're public read-only routes.
 */
import { apiClient } from "./apiClient";

/**
 * Client-side TTL for global data that several components request
 * independently during a single page load (the header, the shop
 * sidebar and the product editor all ask for categories). Combined
 * with apiClient's in-flight deduplication this collapses those into
 * one network call and keeps it for a short while as the shopper
 * moves between pages.
 *
 * Deliberately NOT applied to products, product detail, or anything
 * order/auth/stock related - those must always be read fresh.
 */
const STATIC_TTL_MS = 5 * 60 * 1000;

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
  // Best-effort marketing signal: a short timeout so a slow cold
  // start never leaves a pending request hanging around, and no
  // retry because a missed beat self-corrects on the next one.
  sendPresenceHeartbeat: (slug, sessionId) =>
    apiClient.post(`/products/${slug}/presence`, { sessionId }, null, {
      timeoutMs: 6000,
    }),
};

export const publicCategoriesApi = {
  list: () => apiClient.get(`/categories`, null, { cacheTtlMs: STATIC_TTL_MS }),
  getBySlug: (slug) =>
    apiClient.get(`/categories/${slug}`, null, { cacheTtlMs: STATIC_TTL_MS }),
};

export const publicCollectionsApi = {
  list: () => apiClient.get(`/collections`, null, { cacheTtlMs: STATIC_TTL_MS }),
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
  list: (params) =>
    apiClient.get(`/blogs${toQueryString(params)}`, null, {
      cacheTtlMs: STATIC_TTL_MS,
    }),
  getBySlug: (slug) =>
    apiClient.get(`/blogs/${slug}`, null, { cacheTtlMs: STATIC_TTL_MS }),
};
