/**
 * src/api/apiClient.js
 *
 * Thin fetch wrapper. The access token is passed in explicitly by
 * the caller (from AuthContext's in-memory state) and sent as an
 * Authorization: Bearer header - it is never read from or written
 * to localStorage/sessionStorage/cookies. See context/AuthContext.jsx
 * for why: this is what makes "refresh the page -> logged out" true
 * without any extra code.
 */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = data?.error || "Something went wrong. Please try again.";
    const error = new Error(message);
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path, token) => request(path, { method: "GET", token }),
  post: (path, body, token) => request(path, { method: "POST", body, token }),
  put: (path, body, token) => request(path, { method: "PUT", body, token }),
  patch: (path, body, token) => request(path, { method: "PATCH", body, token }),
  delete: (path, token) => request(path, { method: "DELETE", token }),
};
