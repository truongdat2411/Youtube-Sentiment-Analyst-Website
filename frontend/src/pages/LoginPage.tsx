import { FormEvent, type ReactNode, useState } from "react";

import { theme } from "../theme";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
  topBar?: ReactNode;
  infoMessage?: string | null;
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export default function LoginPage({ onLogin, onGoToRegister, topBar, infoMessage }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onLogin(email.trim(), password);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${theme.pageBgTop} 0%, ${theme.pageBgBottom} 100%)`,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "30px 16px 54px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          color: theme.textMain,
        }}
      >
        {topBar ? <div style={{ marginBottom: 16 }}>{topBar}</div> : null}
        <section
          style={{
            maxWidth: 560,
            margin: "0 auto",
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            background: theme.surface,
            boxShadow: theme.shadow,
            padding: 22,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26 }}>Login</h1>
          <p style={{ margin: "8px 0 0", color: theme.textSoft }}>
            Sign in to save and access your analysis history.
          </p>

          {infoMessage ? (
            <p
              style={{
                marginTop: 14,
                border: `1px solid ${theme.primary}`,
                background: "rgba(79, 70, 229, 0.09)",
                color: theme.primary,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              {infoMessage}
            </p>
          ) : null}

          {error ? (
            <p
              style={{
                marginTop: 14,
                border: `1px solid ${theme.negative}`,
                background: theme.negativeBg,
                color: theme.negative,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                style={{
                  height: 42,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: "0 12px",
                  color: theme.textMain,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                disabled={loading}
                style={{
                  height: 42,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  padding: "0 12px",
                  color: theme.textMain,
                }}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 42,
                border: "none",
                borderRadius: 10,
                background: loading ? "rgba(79, 70, 229, 0.45)" : theme.primary,
                color: theme.surface,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p style={{ margin: "14px 0 0", color: theme.textSoft }}>
            No account yet?{" "}
            <button
              type="button"
              onClick={onGoToRegister}
              style={{
                border: "none",
                background: "transparent",
                color: theme.primary,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Register
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
