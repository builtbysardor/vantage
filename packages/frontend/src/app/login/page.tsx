"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useV } from "@/lib/vcontext";
import { infrawatch } from "@/lib/api/infrawatch";
import { setToken, setNexusToken } from "@/lib/auth";
import { VLogo } from "@/components/ui/Logo";
import { VIcon } from "@/components/ui/Icons";

export default function LoginPage() {
  const router = useRouter();
  const { dark, setDark, setUser } = useV();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await infrawatch.login(username, password);
      if (data.access_token) {
        setToken(data.access_token);
        if (data.nexus_token) {
          setNexusToken(data.nexus_token);
        } else {
          // Try nexus login separately
          try {
            const nexusBase =
              process.env.NEXT_PUBLIC_API_NEXUS_URL ?? "http://localhost:3001";
            const nexusData = await fetch(`${nexusBase}/api/auth/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            }).then((r) => r.json());
            if (nexusData?.token) setNexusToken(nexusData.token);
            else setNexusToken(data.access_token);
          } catch {
            setNexusToken(data.access_token);
          }
        }
        // Fetch user info
        try {
          const me = await infrawatch.me();
          setUser(me);
        } catch {
          setUser({ username, role: "user" });
        }
        router.push("/");
      } else {
        setError(data.detail || "Invalid credentials");
      }
    } catch {
      setError("Cannot reach InfraWatch API — check that the backend is running on localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: 9,
          border: "1px solid var(--border)",
          background: "var(--elevated)",
          cursor: "pointer",
          color: "var(--text-sec)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VIcon name={dark ? "sun" : "moon"} size={16} />
      </button>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}
        >
          <VLogo size={36} />
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--brand)",
                letterSpacing: "-0.02em",
              }}
            >
              VANTAGE
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Observability Platform
            </div>
          </div>
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 6,
            marginTop: 0,
          }}
        >
          Sign in
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, marginTop: 0 }}>
          Default credentials:{" "}
          <code
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              color: "var(--brand)",
            }}
          >
            admin / infrawatch
          </code>
        </p>

        {error && (
          <div
            style={{
              background: "var(--crit-dim)",
              border: "1px solid var(--crit)",
              borderRadius: 9,
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--crit)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Username */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-sec)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <div style={{ position: "relative" }}>
              <VIcon
                name="user"
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
                autoComplete="username"
                style={{
                  width: "100%",
                  height: 42,
                  paddingLeft: 36,
                  paddingRight: 14,
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  fontSize: 14,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-sec)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <VIcon
                name="lock"
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  height: 42,
                  paddingLeft: 36,
                  paddingRight: 44,
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  fontSize: 14,
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                <VIcon name={showPw ? "eyeOff" : "eye"} size={14} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              height: 44,
              background: loading ? "var(--elevated)" : "var(--brand)",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: loading ? "var(--text-muted)" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
              marginTop: 4,
            }}
          >
            {loading ? (
              <>
                <VIcon
                  name="refresh"
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
