import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";

/**
 * Wraps any storefront page that must not be reachable without an
 * active session - most importantly /checkout, per the requirement
 * that guests can browse and cart but cannot check out unless
 * logged in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useCustomerAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
