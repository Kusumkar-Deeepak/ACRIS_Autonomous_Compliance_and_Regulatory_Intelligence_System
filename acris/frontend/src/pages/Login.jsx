import { useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../app/AuthProvider.jsx";

function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      login(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
          <section className="acris-card relative overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.18),transparent_30%)]" />
            <div className="relative max-w-xl">
              <p className="acris-label">
                Autonomous Compliance & Regulatory Intelligence System
              </p>
              <h1 className="mt-3 font-display text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
                Upload a regulatory PDF and let ACRIS run the full compliance
                pipeline.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Phase 2 provides a routed workspace for PDF upload, parsing,
                semantic diffing, policy mapping, draft amendments, and PDF
                report generation. Use the dashboard to review every stage.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["6 Agents", "Sequential PDF pipeline"],
                  ["MongoDB", "Audit trail and outputs"],
                  ["Ollama", "Local LLM drafting"],
                ].map(([title, subtitle]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-3"
                  >
                    <div className="text-sm font-semibold text-white">
                      {title}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {subtitle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="acris-card p-5 sm:p-6 lg:p-7">
            <h2 className="font-display text-2xl text-white">Secure Login</h2>
            <p className="mt-2 text-sm text-slate-400">
              Sign in with your work email.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="acris-label">Email</span>
                <input
                  type="email"
                  className="acris-input mt-2"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="you@company.com"
                />
              </label>
              <label className="block">
                <span className="acris-label">Password</span>
                <input
                  type="password"
                  className="acris-input mt-2"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  placeholder="Enter your password"
                />
              </label>

              {error ? (
                <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button className="acris-button w-full" disabled={loading}>
                {loading ? "Signing in..." : "Enter Dashboard"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Login;
