"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // Cookie is set by the server; refresh so the guard sees it.
      router.replace("/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="eyebrow text-taupe">Lavender Hill</p>
          <h1 className="text-2xl mt-2 tracking-[0.06em]">Admin Sign In</h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-cream border border-line rounded-xl shadow-soft-lg p-7 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-espresso/60">
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-line rounded-md px-3 py-2.5 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.12em] text-espresso/60">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-line rounded-md px-3 py-2.5 text-sm bg-white text-espresso focus:outline-none focus:border-espresso transition-colors"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="text-sm text-[#b23a3a] bg-[#f4dede] border border-[#e6bcbc] rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-lh mt-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-espresso/40 mt-6">
          Authorised access only.
        </p>
      </div>
    </div>
  );
}
