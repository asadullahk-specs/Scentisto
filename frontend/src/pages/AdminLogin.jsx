import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import logoWordmarkWhite from "../assets/logo-wordmark-white.png";

export default function AdminLogin() {
  const { login, loading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/admin/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs tracking-luxury uppercase text-bg/50 mb-3">
            Admin CMS
          </p>
          <img
            src={logoWordmarkWhite}
            alt="SCENTISTO"
            className="h-8 w-auto mx-auto"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 border border-bg/20 p-8"
        >
          {formError && (
            <p className="text-sm text-red-300 border border-red-900 bg-red-950/40 px-4 py-3">
              {formError}
            </p>
          )}

          <div>
            <label className="block text-xs uppercase tracking-luxury text-bg/60 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full bg-transparent border border-bg/25 px-4 py-3 text-sm text-bg placeholder:text-bg/30 focus:border-bg transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-luxury text-bg/60 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full bg-transparent border border-bg/25 px-4 py-3 text-sm text-bg placeholder:text-bg/30 focus:border-bg transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bg text-ink px-8 py-3.5 text-sm tracking-luxury uppercase hover:bg-bg/90 transition-colors disabled:opacity-40"
          >
            {loading ? "Verifying…" : "Sign In to Admin"}
          </button>
        </form>

        <p className="text-center text-xs text-bg/30 mt-6">
          Restricted access. All sign-ins are logged. Session ends on refresh.
        </p>
      </div>
    </div>
  );
}
