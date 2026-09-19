import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import logoWordmark from "../assets/logo-wordmark.png";

export default function Login() {
  const { login, loading } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

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
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-ink/50 hover:text-ink mb-8"
        >
          <span aria-hidden="true">←</span> Back to Home
        </Link>

        <div className="text-center mb-10">
          <p className="text-xs tracking-luxury uppercase text-ink/50 mb-3">
            Welcome back
          </p>
          <img
            src={logoWordmark}
            alt="SCENTISTO"
            className="h-8 w-auto mx-auto"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 border border-border p-8"
        >
          {formError && (
            <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3">
              {formError}
            </p>
          )}

          <div>
            <label className="label-luxury" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input-luxury"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label-luxury" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input-luxury"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p className="text-center text-sm text-ink/60">
            New to SCENTISTO?{" "}
            <Link
              to="/register"
              className="text-ink underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </form>

        <p className="text-center text-xs text-ink/40 mt-6">
          For your security, you'll be signed out automatically if you refresh
          or close this page.
        </p>
      </div>
    </div>
  );
}
