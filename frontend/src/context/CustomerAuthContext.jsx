import { createAuthContext } from "./createAuthContext";

export const { Provider: CustomerAuthProvider, useAuth: useCustomerAuth } =
  createAuthContext({
    loginPath: "/auth/login",
    registerPath: "/auth/register",
    mePath: "/auth/me",
    logoutPath: "/auth/logout",
  });
