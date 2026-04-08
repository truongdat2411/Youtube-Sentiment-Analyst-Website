import { type CSSProperties, useEffect, useMemo, useState } from "react";

import App from "./App";
import { AuthProvider, useAuth } from "./auth";
import PageLayout from "./components/PageLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminUsersPage from "./pages/AdminUsersPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { theme } from "./theme";

type RouteName = "analyze" | "login" | "register" | "history" | "admin";

function routeFromHash(hash: string): RouteName {
  const value = hash.replace(/^#/, "").toLowerCase();
  if (value === "/login") {
    return "login";
  }
  if (value === "/register") {
    return "register";
  }
  if (value === "/history") {
    return "history";
  }
  if (value === "/admin") {
    return "admin";
  }
  return "analyze";
}

function routeToHash(route: RouteName): string {
  if (route === "login") {
    return "#/login";
  }
  if (route === "register") {
    return "#/register";
  }
  if (route === "history") {
    return "#/history";
  }
  if (route === "admin") {
    return "#/admin";
  }
  return "#/";
}

function navigate(route: RouteName) {
  const nextHash = routeToHash(route);
  if (window.location.hash === nextHash) {
    return;
  }
  window.location.hash = nextHash;
}

interface TopNavProps {
  route: RouteName;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isAdmin: boolean;
  username: string | null;
  onNavigate: (route: RouteName) => void;
  onLogout: () => void;
}

function TopNav({
  route,
  isAuthenticated,
  isInitializing,
  isAdmin,
  username,
  onNavigate,
  onLogout,
}: TopNavProps) {
  const linkStyle = (active: boolean): CSSProperties => ({
    height: 36,
    borderRadius: 9,
    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
    background: active ? "rgba(79, 70, 229, 0.10)" : theme.surface,
    color: active ? theme.primary : theme.textMain,
    padding: "0 12px",
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        background: theme.surface,
        boxShadow: theme.shadow,
        padding: "10px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onNavigate("analyze")} style={linkStyle(route === "analyze")}>
          Analyze Page
        </button>
        {isAuthenticated ? (
          <button type="button" onClick={() => onNavigate("history")} style={linkStyle(route === "history")}>
            History
          </button>
        ) : null}
        {isAuthenticated && isAdmin ? (
          <button type="button" onClick={() => onNavigate("admin")} style={linkStyle(route === "admin")}>
            Admin
          </button>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {isInitializing ? <span style={{ color: theme.textSoft, fontSize: 13 }}>Restoring session...</span> : null}
        {isAuthenticated ? (
          <>
            <span style={{ color: theme.textSoft, fontSize: 13 }}>
              Signed in as <strong style={{ color: theme.textMain }}>{username || "user"}</strong>
            </span>
            <button
              type="button"
              onClick={onLogout}
              style={{
                height: 36,
                borderRadius: 9,
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.textMain,
                padding: "0 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onNavigate("login")} style={linkStyle(route === "login")}>
              Login
            </button>
            <button type="button" onClick={() => onNavigate("register")} style={linkStyle(route === "register")}>
              Register
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AppShell() {
  const auth = useAuth();
  const isAdmin = auth.user?.role === "admin";
  const [route, setRoute] = useState<RouteName>(() => {
    if (typeof window === "undefined") {
      return "analyze";
    }
    return routeFromHash(window.location.hash);
  });
  const [protectedInfo, setProtectedInfo] = useState<string | null>(null);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<RouteName>("analyze");

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const topBar = useMemo(
    () => (
      <TopNav
        route={route}
        isAuthenticated={auth.isAuthenticated}
        isInitializing={auth.isInitializing}
        isAdmin={isAdmin}
        username={auth.user?.username ?? null}
        onNavigate={(nextRoute) => {
          setProtectedInfo(null);
          if (nextRoute === "history" && !auth.isAuthenticated) {
            setProtectedInfo("Please log in to access your saved history.");
            setRedirectAfterAuth("history");
            navigate("login");
            setRoute("login");
            return;
          }
          if (nextRoute === "admin" && !auth.isAuthenticated) {
            setProtectedInfo("Please log in with an admin account.");
            setRedirectAfterAuth("admin");
            navigate("login");
            setRoute("login");
            return;
          }
          if (nextRoute === "admin" && !isAdmin) {
            setProtectedInfo("Admin access required.");
            navigate("analyze");
            setRoute("analyze");
            return;
          }
          navigate(nextRoute);
          setRoute(nextRoute);
        }}
        onLogout={() => {
          auth.logout();
          setProtectedInfo(null);
          navigate("analyze");
          setRoute("analyze");
        }}
      />
    ),
    [auth, route, isAdmin]
  );

  if (route === "login") {
    return (
      <LoginPage
        topBar={topBar}
        infoMessage={protectedInfo}
        onGoToRegister={() => {
          setProtectedInfo(null);
          navigate("register");
          setRoute("register");
        }}
        onLogin={async (email, password) => {
          const loggedInUser = await auth.login(email, password);
          setProtectedInfo(null);
          const next = redirectAfterAuth;
          setRedirectAfterAuth("analyze");
          if (next === "admin" && loggedInUser.role !== "admin") {
            setProtectedInfo("Admin access required.");
            navigate("analyze");
            setRoute("analyze");
            return;
          }
          navigate(next);
          setRoute(next);
        }}
      />
    );
  }

  if (route === "register") {
    return (
      <RegisterPage
        topBar={topBar}
        onGoToLogin={() => {
          navigate("login");
          setRoute("login");
        }}
        onRegister={async (payload) => {
          await auth.register(payload);
          setProtectedInfo("Registration successful. Please log in.");
          navigate("login");
          setRoute("login");
        }}
      />
    );
  }

  if (route === "history") {
    if (auth.isInitializing && auth.token) {
      return (
        <PageLayout
          topBar={topBar}
          title="Analysis History"
          subtitle="Restoring your session..."
        >
          <p style={{ margin: 0, color: theme.textSoft }}>Please wait.</p>
        </PageLayout>
      );
    }

    return (
      <ProtectedRoute
        isAllowed={auth.isAuthenticated && Boolean(auth.token)}
        fallback={
          <LoginPage
            topBar={topBar}
            infoMessage="Please log in to access your saved history."
            onGoToRegister={() => {
              navigate("register");
              setRoute("register");
            }}
            onLogin={async (email, password) => {
              await auth.login(email, password);
              navigate("history");
              setRoute("history");
            }}
          />
        }
      >
        <HistoryPage topBar={topBar} token={auth.token as string} />
      </ProtectedRoute>
    );
  }

  if (route === "admin") {
    if (auth.isInitializing && auth.token) {
      return (
        <PageLayout
          topBar={topBar}
          title="Admin"
          subtitle="Restoring your session..."
        >
          <p style={{ margin: 0, color: theme.textSoft }}>Please wait.</p>
        </PageLayout>
      );
    }

    if (!auth.isAuthenticated || !auth.token) {
      return (
        <LoginPage
          topBar={topBar}
          infoMessage="Please log in with an admin account."
          onGoToRegister={() => {
            navigate("register");
            setRoute("register");
          }}
          onLogin={async (email, password) => {
            const loggedInUser = await auth.login(email, password);
            if (loggedInUser.role !== "admin") {
              setProtectedInfo("Admin access required.");
              navigate("analyze");
              setRoute("analyze");
              return;
            }
            navigate("admin");
            setRoute("admin");
          }}
        />
      );
    }

    if (!isAdmin) {
      return (
        <PageLayout
          topBar={topBar}
          title="Unauthorized"
          subtitle="You do not have permission to access admin tools."
        >
          <p style={{ margin: 0, color: theme.textSoft }}>
            This area is available to admin users only.
          </p>
        </PageLayout>
      );
    }

    return <AdminUsersPage token={auth.token} topBar={topBar} />;
  }

  return (
    <App
      topBar={topBar}
      accessToken={auth.token}
      loginHint={
        auth.isAuthenticated ? null : "Log in to save your analysis history automatically."
      }
    />
  );
}

export default function RootApp() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
