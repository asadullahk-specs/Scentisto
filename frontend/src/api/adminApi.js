/**
 * src/api/adminApi.js
 * Thin, typed-by-convention wrappers around apiClient for every
 * Admin CMS product-system endpoint added in Phase 1's backend.
 * Every function takes the admin access token explicitly (from
 * AdminAuthContext) - never reads it from storage.
 */
import { apiClient, invalidateCache } from "./apiClient";

/**
 * After an Admin mutation succeeds, drop any cached public GET it
 * could have changed. Without this, an admin who publishes a product
 * and then opens the storefront in the same tab session can still be
 * served the pre-edit list out of apiClient's TTL cache - the
 * "database updated but the UI didn't" symptom.
 *
 * (This clears the *client* cache. The CDN's own short s-maxage
 * window, set in backend/src/app.js, is the other half and is why
 * those windows are kept to 30-120s.)
 */
const READ_ONLY = new Set(["list", "get", "unreadCount"]);

function withInvalidation(api, publicPrefixes) {
  const wrapped = {};
  for (const [name, fn] of Object.entries(api)) {
    if (typeof fn !== "function" || READ_ONLY.has(name)) {
      wrapped[name] = fn;
      continue;
    }
    wrapped[name] = async (...args) => {
      const result = await fn(...args);
      publicPrefixes.forEach((prefix) => invalidateCache(prefix));
      return result;
    };
  }
  return wrapped;
}

function toQueryString(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      usp.set(key, value);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

const adminProductsApiRaw = {
  list: (token, params) =>
    apiClient.get(`/admin/products${toQueryString(params)}`, token),
  get: (token, id) => apiClient.get(`/admin/products/${id}`, token),
  create: (token, payload) => apiClient.post(`/admin/products`, payload, token),
  update: (token, id, payload) =>
    apiClient.put(`/admin/products/${id}`, payload, token),
  setStatus: (token, id, status) =>
    apiClient.patch(`/admin/products/${id}/status`, { status }, token),
  duplicate: (token, id) =>
    apiClient.post(`/admin/products/${id}/duplicate`, {}, token),
  remove: (token, id) => apiClient.delete(`/admin/products/${id}`, token),

  // Variants
  createVariant: (token, productId, payload) =>
    apiClient.post(`/admin/products/${productId}/variants`, payload, token),
  updateVariant: (token, productId, variantId, payload) =>
    apiClient.put(
      `/admin/products/${productId}/variants/${variantId}`,
      payload,
      token,
    ),
  removeVariant: (token, productId, variantId) =>
    apiClient.delete(
      `/admin/products/${productId}/variants/${variantId}`,
      token,
    ),

  // Media
  createMedia: (token, productId, payload) =>
    apiClient.post(`/admin/products/${productId}/media`, payload, token),
  updateMedia: (token, productId, mediaId, payload) =>
    apiClient.put(
      `/admin/products/${productId}/media/${mediaId}`,
      payload,
      token,
    ),
  reorderMedia: (token, productId, orderedIds) =>
    apiClient.post(
      `/admin/products/${productId}/media/reorder`,
      { orderedIds },
      token,
    ),
  removeMedia: (token, productId, mediaId) =>
    apiClient.delete(`/admin/products/${productId}/media/${mediaId}`, token),

  // Long-form details
  updateDetails: (token, productId, payload) =>
    apiClient.put(`/admin/products/${productId}/details`, payload, token),

  // Related products
  setRelated: (token, productId, relationType, relatedProductIds) =>
    apiClient.put(
      `/admin/products/${productId}/related`,
      { relationType, relatedProductIds },
      token,
    ),

  // Gift pack contents (only meaningful for type: 'gift_pack')
  setGiftPackItems: (token, productId, items) =>
    apiClient.put(
      `/admin/products/${productId}/gift-pack-items`,
      { items },
      token,
    ),
};

export const adminMediaLibraryApi = {
  list: (token, params) =>
    apiClient.get(
      `/admin/products/media-library${toQueryString(params)}`,
      token,
    ),
};

const adminCategoriesApiRaw = {
  list: (token) => apiClient.get(`/admin/categories`, token),
  create: (token, payload) =>
    apiClient.post(`/admin/categories`, payload, token),
  update: (token, id, payload) =>
    apiClient.put(`/admin/categories/${id}`, payload, token),
  remove: (token, id) => apiClient.delete(`/admin/categories/${id}`, token),
};

const adminCollectionsApiRaw = {
  list: (token) => apiClient.get(`/admin/collections`, token),
  create: (token, payload) =>
    apiClient.post(`/admin/collections`, payload, token),
  update: (token, id, payload) =>
    apiClient.put(`/admin/collections/${id}`, payload, token),
  remove: (token, id) => apiClient.delete(`/admin/collections/${id}`, token),
};

const adminReviewsApiRaw = {
  list: (token, params) =>
    apiClient.get(`/admin/reviews${toQueryString(params)}`, token),
  setStatus: (token, id, status) =>
    apiClient.patch(`/admin/reviews/${id}/status`, { status }, token),
  setFeatured: (token, id, isFeatured) =>
    apiClient.patch(`/admin/reviews/${id}/featured`, { isFeatured }, token),
  reply: (token, id, adminReply) =>
    apiClient.post(`/admin/reviews/${id}/reply`, { adminReply }, token),
  remove: (token, id) => apiClient.delete(`/admin/reviews/${id}`, token),
};

const adminBlogsApiRaw = {
  list: (token, params) =>
    apiClient.get(`/admin/blogs${toQueryString(params)}`, token),
  get: (token, id) => apiClient.get(`/admin/blogs/${id}`, token),
  create: (token, payload) => apiClient.post(`/admin/blogs`, payload, token),
  update: (token, id, payload) =>
    apiClient.put(`/admin/blogs/${id}`, payload, token),
  setStatus: (token, id, status) =>
    apiClient.patch(`/admin/blogs/${id}/status`, { status }, token),
  remove: (token, id) => apiClient.delete(`/admin/blogs/${id}`, token),
};

export const adminNotificationsApi = {
  list: (token, params) =>
    apiClient.get(`/admin/notifications${toQueryString(params)}`, token),
  unreadCount: (token) =>
    apiClient.get(`/admin/notifications/unread-count`, token),
  markRead: (token, id) =>
    apiClient.patch(`/admin/notifications/${id}/read`, {}, token),
  markAllRead: (token) =>
    apiClient.patch(`/admin/notifications/read-all`, {}, token),
};

export const adminAnalyticsApi = {
  getDashboard: (token, days) =>
    apiClient.get(
      `/admin/analytics/dashboard${toQueryString({ days })}`,
      token,
    ),
  getActivityLog: (token, params) =>
    apiClient.get(
      `/admin/analytics/activity-log${toQueryString(params)}`,
      token,
    ),
};

const adminHomepageApiRaw = {
  list: (token) => apiClient.get(`/admin/homepage-sections`, token),
  create: (token, payload) =>
    apiClient.post(`/admin/homepage-sections`, payload, token),
  update: (token, id, payload) =>
    apiClient.put(`/admin/homepage-sections/${id}`, payload, token),
  reorder: (token, orderedIds) =>
    apiClient.put(`/admin/homepage-sections/reorder`, { orderedIds }, token),
  remove: (token, id) =>
    apiClient.delete(`/admin/homepage-sections/${id}`, token),
};

export const adminProductsApi = withInvalidation(adminProductsApiRaw, ["/products", "/homepage", "/collections"]);
export const adminCategoriesApi = withInvalidation(adminCategoriesApiRaw, ["/categories", "/products"]);
export const adminCollectionsApi = withInvalidation(adminCollectionsApiRaw, ["/collections", "/products"]);
export const adminReviewsApi = withInvalidation(adminReviewsApiRaw, ["/reviews", "/homepage"]);
export const adminBlogsApi = withInvalidation(adminBlogsApiRaw, ["/blogs"]);
export const adminHomepageApi = withInvalidation(adminHomepageApiRaw, ["/homepage"]);
