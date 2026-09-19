/**
 * src/api/apiClient.js
 *
 * Thin fetch wrapper. The access token is passed in explicitly by
 * the caller (from AuthContext's in-memory state) and sent as an
 * Authorization: Bearer header - it is never read from or written
 * to localStorage/sessionStorage/cookies. See
 * context/createAuthContext.jsx for why: that is what makes
 * "refresh the page -> logged out" true without any extra code.
 *
 * Beyond that it now handles four things the storefront was missing:
 *
 * 1. TIMEOUTS. A bare fetch() has no timeout. If the serverless
 *    function cold-starts badly or Atlas is unreachable, the promise
 *    never settles and the page sits on "Loading..." forever with no
 *    way out. Every request is now aborted after a deadline.
 *
 * 2. RETRIES - for safe requests only. A GET may be retried; a POST
 *    that creates an order, a PUT, PATCH or DELETE never is,
 *    because retrying those can duplicate an order or re-apply a
 *    mutation.
 *
 * 3. IN-FLIGHT DEDUPLICATION. Several components mount at once and
 *    each ask for the same global data (categories, collections).
 *    Identical concurrent GETs now share one network request.
 *
 * 4. A SHORT TTL CACHE for genuinely static GETs, opted into per
 *    call. Nothing session-scoped is ever cached, and any mutation
 *    clears it (see invalidateCache).
 */

// Default to a same-origin relative path. In the deployed topology
// vercel.json rewrites /api/* to the serverless function, so the
// storefront and the API share a domain and no absolute URL - and in
// particular no localhost URL - should ever be baked into the bundle.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL;

function resolveBase() {
  const value = (RAW_BASE || "").trim();
  if (!value) return "/api";
  // Guard rail: a localhost API base is a development-only value. If
  // one survives into a production build (e.g. a stray frontend/.env
  // committed to the repo, which is exactly how this broke before),
  // fall back to the same-origin path instead of shipping a bundle
  // that calls a machine the visitor doesn't have.
  if (import.meta.env.PROD && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(value)) {
    console.warn(
      "[scentisto] VITE_API_BASE_URL points at localhost in a production build; falling back to same-origin /api.",
    );
    return "/api";
  }
  return value.replace(/\/$/, "");
}

const API_BASE = resolveBase();

const DEFAULT_TIMEOUT_MS = 15000;
const GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

const inFlight = new Map(); // cacheKey -> Promise
const cache = new Map(); // cacheKey -> { expiresAt, data }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class ApiError extends Error {
  constructor(message, { status, details, isTimeout = false, isNetwork = false }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.isTimeout = isTimeout;
    this.isNetwork = isNetwork;
  }
}

/** 5xx, 429 and transport failures are worth retrying; 4xx is not. */
function isRetryable(error) {
  if (error.isTimeout || error.isNetwork) return true;
  return error.status === 429 || (error.status >= 500 && error.status <= 599);
}

async function performRequest(path, { method, body, token, timeoutMs }) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError(
        "The server took too long to respond. Please try again.",
        { status: 0, isTimeout: true },
      );
    }
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      { status: 0, isNetwork: true },
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Not every response carries a JSON body (e.g. a 502 from the
    // platform before the function ran). Handled below.
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Request failed (${res.status}). Please try again.`,
      { status: res.status, details: data?.details },
    );
  }

  return data;
}

async function request(
  path,
  { method = "GET", body, token, timeoutMs = DEFAULT_TIMEOUT_MS, cacheTtlMs = 0 } = {},
) {
  const isSafe = method === "GET";

  // Only unauthenticated GETs are ever shared between callers - a
  // token-scoped response must never be handed to a different caller.
  const shareable = isSafe && !token;
  const key = shareable ? `GET ${path}` : null;

  if (key && cacheTtlMs > 0) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
    if (hit) cache.delete(key);
  }

  if (key && inFlight.has(key)) return inFlight.get(key);

  const attempt = async () => {
    const maxAttempts = isSafe ? GET_RETRIES + 1 : 1;
    let lastError;
    for (let i = 0; i < maxAttempts; i += 1) {
      try {
        return await performRequest(path, { method, body, token, timeoutMs });
      } catch (err) {
        lastError = err;
        if (i === maxAttempts - 1 || !isRetryable(err)) throw err;
        await sleep(RETRY_BASE_DELAY_MS * 2 ** i);
      }
    }
    throw lastError;
  };

  const promise = attempt()
    .then((data) => {
      if (key && cacheTtlMs > 0) {
        cache.set(key, { expiresAt: Date.now() + cacheTtlMs, data });
      }
      return data;
    })
    .finally(() => {
      if (key) inFlight.delete(key);
    });

  if (key) inFlight.set(key, promise);
  return promise;
}

/**
 * Drops cached GET responses. Call after any mutation that could
 * change what a cached read returns, so the Admin never sees a stale
 * list after a successful save. With no argument, clears everything.
 */
export function invalidateCache(pathPrefix) {
  if (!pathPrefix) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`GET ${pathPrefix}`)) cache.delete(key);
  }
}

export const apiClient = {
  get: (path, token, options = {}) =>
    request(path, { method: "GET", token, ...options }),
  post: (path, body, token, options = {}) =>
    request(path, { method: "POST", body, token, ...options }),
  put: (path, body, token, options = {}) =>
    request(path, { method: "PUT", body, token, ...options }),
  patch: (path, body, token, options = {}) =>
    request(path, { method: "PATCH", body, token, ...options }),
  delete: (path, token, options = {}) =>
    request(path, { method: "DELETE", token, ...options }),
};

export { ApiError, API_BASE };
