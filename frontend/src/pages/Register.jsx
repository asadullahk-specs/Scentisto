import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";

const RULES = [
  { test: (p) => p.length >= 10, label: "At least 10 characters" },
  {
    test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
    label: "Upper & lowercase letters",
  },
  { test: (p) => /[0-9]/.test(p), label: "At least one number" },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: "At least one symbol" },
];

export default function Register() {
  const { register, loading } = useCustomerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setFormError(err.details?.map((d) => d.message).join(" ") || err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-xs tracking-luxury uppercase text-ink/50 mb-3">
            Join SCENTISTO
          </p>
          <h1 className="text-3xl">Create Account</h1>
        </div>

        {success ? (
          <div className="border border-border p-8 text-center">
            <p className="text-ink">Account created. Redirecting to sign in…</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 border border-border p-8"
          >
            {formError && (
              <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-luxury">First Name</label>
                <input
                  required
                  className="input-luxury"
                  value={form.firstName}
                  onChange={update("firstName")}
                />
              </div>
              <div>
                <label className="label-luxury">Last Name</label>
                <input
                  required
                  className="input-luxury"
                  value={form.lastName}
                  onChange={update("lastName")}
                />
              </div>
            </div>

            <div>
              <label className="label-luxury">Email</label>
              <input
                type="email"
                required
                className="input-luxury"
                value={form.email}
                onChange={update("email")}
              />
            </div>

            <div>
              <label className="label-luxury">Phone (optional)</label>
              <input
                className="input-luxury"
                value={form.phone}
                onChange={update("phone")}
              />
            </div>

            <div>
              <label className="label-luxury">Password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                className="input-luxury"
                value={form.password}
                onChange={update("password")}
              />
              <ul className="mt-3 space-y-1">
                {RULES.map((rule) => {
                  const met = rule.test(form.password);
                  return (
                    <li
                      key={rule.label}
                      className={`text-xs flex items-center gap-2 ${met ? "text-ink" : "text-ink/40"}`}
                    >
                      <span>{met ? "✓" : " - "}</span> {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <p className="text-center text-sm text-ink/60">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-ink underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
