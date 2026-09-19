import React, { createContext, useContext, useState, useCallback } from "react";
import { apiClient } from "../api/apiClient";

/**
 * createAuthContext(config)
 *
 * Produces an isolated { Provider, useAuth } pair for one auth
 * "world" - storefront customers or Admin CMS staff - so a
 * customer token and an admin token can never be confused with
 * each other, even if both are open in the same browser.
 *
 * SECURITY / UX NOTE - intentional design, not an oversight:
 * The access token lives ONLY in this component's React state
 * (useState). It is never written to localStorage, sessionStorage,
 * or a cookie. That means:
 * - A page refresh (or opening a new tab) clears React state,
 * so the user/admin is automatically logged out - this is a
 * hard product requirement, not an accident.
 * - There is nothing in browser storage for an XSS payload to
 * steal, and nothing in a cookie for CSRF to ride on.
 * The trade-off is reduced convenience (no persistent "stay logged
 * in" across refresh) in exchange for a materially smaller attack
 * surface, which is the trade the spec explicitly asked for.
 */
export function createAuthContext({
  loginPath,
  registerPath,
  mePath,
  logoutPath,
}) {
  const Ctx = createContext(null);

  function Provider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = useCallback(async (email, password) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.post(loginPath, { email, password });
        setToken(data.accessToken);
        setUser(data.user);
        return data.user;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []);

    const register = useCallback(async (payload) => {
      if (!registerPath) throw new Error("Registration not available.");
      setLoading(true);
      setError(null);
      try {
        return await apiClient.post(registerPath, payload);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }, []);

    const logout = useCallback(async () => {
      try {
        if (token) await apiClient.post(logoutPath, {}, token);
      } catch {
        // best-effort - clear local state regardless
      } finally {
        setToken(null);
        setUser(null);
      }
    }, [token]);

    const refreshMe = useCallback(async () => {
      if (!token) return null;
      try {
        const data = await apiClient.get(mePath, token);
        setUser(data.user);
        return data.user;
      } catch {
        setToken(null);
        setUser(null);
        return null;
      }
    }, [token]);

    const value = {
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      error,
      login,
      register,
      logout,
      refreshMe,
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }

  function useAuth() {
    const ctx = useContext(Ctx);
    if (!ctx)
      throw new Error("useAuth must be used within its matching Provider.");
    return ctx;
  }

  return { Provider, useAuth };
}
