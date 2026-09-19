import { createAuthContext } from "./createAuthContext";

export const { Provider: AdminAuthProvider, useAuth: useAdminAuth } =
  createAuthContext({
    loginPath: "/auth/admin/login",
    registerPath: null, // admin accounts are provisioned, not self-registered
    mePath: "/auth/admin/me",
    logoutPath: "/auth/logout",
  });
