"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { infrawatch } from "@/lib/api/infrawatch";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await infrawatch.login(username, password);
      if (!data.access_token) throw new Error("Invalid credentials");
      setToken(data.access_token);
      router.push("/");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-mono text-2xl font-bold text-brand">VANTAGE</span>
          <p className="text-sm text-muted mt-1">Observability Platform</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text">Sign in</h2>
          {error && (
            <div className="bg-critical/10 border border-critical/30 rounded-lg px-3 py-2 text-xs text-critical">{error}</div>
          )}
          <div>
            <label className="block text-xs text-muted mb-1.5">Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-brand transition-colors"
              placeholder="admin" required
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-brand transition-colors"
              placeholder="••••••••" required
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover text-canvas font-semibold text-sm py-2 rounded-lg transition-colors disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
