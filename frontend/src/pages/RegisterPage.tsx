import { FormEvent, type ReactNode, useState } from "react";

import { theme } from "../theme";

interface RegisterPageProps {
  onRegister: (payload: { email: string; username: string; password: string }) => Promise<void>;
  onGoToLogin: () => void;
  topBar?: ReactNode;
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

function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Username is required.";
  }
  if (trimmed.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (trimmed.length > 50) {
    return "Username must be at most 50 characters.";
  }
  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores.";
  }
  return null;
}

function validatePassword(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (value.length > 128) {
    return "Password is too long.";
  }
  return null;
}

export default function RegisterPage({ onRegister, onGoToLogin, topBar }: RegisterPageProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setSuccessMessage(null);
      return;
    }
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      setSuccessMessage(null);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setSuccessMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await onRegister({
        email: email.trim(),
        username: username.trim(),
        password,
      });
      setSuccessMessage("Registration successful. You can now log in.");
      setPassword("");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Registration failed.";
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
          <h1 style={{ margin: 0, fontSize: 26 }}>Register</h1>
          <p style={{ margin: "8px 0 0", color: theme.textSoft }}>Create an account to save analysis history.</p>

          {successMessage ? (
            <p
              style={{
                marginTop: 14,
                border: `1px solid ${theme.positive}`,
                background: theme.positiveBg,
                color: theme.positive,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              {successMessage}
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
              <span style={{ fontWeight: 600 }}>Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                autoComplete="username"
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
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
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p style={{ margin: "14px 0 0", color: theme.textSoft }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={onGoToLogin}
              style={{
                border: "none",
                background: "transparent",
                color: theme.primary,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Login
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
