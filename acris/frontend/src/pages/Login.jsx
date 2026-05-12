import { useState } from "react";
import api from "../api/axios.js";

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      onLogin(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 flex items-center justify-center">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="acris-card relative overflow-hidden p-8 lg:p-12">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.18),transparent_30%)]" />
          <div className="relative max-w-xl">
            <p className="acris-label">
              Autonomous Compliance & Regulatory Intelligence System
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-6xl">
              Upload a regulatory PDF and let ACRIS run the full compliance
              pipeline.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Phase 1 is built for local execution: PDF upload, parsing,
              semantic diffing, policy mapping, draft amendments, and PDF report
              generation. Use the dashboard to review every stage.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["6 Agents", "Sequential PDF pipeline"],
                ["MongoDB", "Audit trail and outputs"],
                ["Ollama", "Local LLM drafting"],
              ].map(([title, subtitle]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div className="text-sm font-semibold text-white">
                    {title}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="acris-card p-6 lg:p-8">
          <h2 className="font-display text-2xl text-white">Admin Login</h2>
          <p className="mt-2 text-sm text-slate-400">
            Default demo credentials: admin / admin123
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="acris-label">Username</span>
              <input
                className="acris-input mt-2"
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                placeholder="admin"
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
                placeholder="admin123"
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
  );
}

export default Login;
