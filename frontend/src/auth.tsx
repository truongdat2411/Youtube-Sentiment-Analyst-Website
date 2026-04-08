import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  type AuthUser,
  getCurrentUser,
  loginUser,
  registerUser,
  type RegisterRequest,
} from "./api";

const ACCESS_TOKEN_STORAGE_KEY = "web_sentiment_access_token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  register: (payload: RegisterRequest) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function persistToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors to keep UI functional in restricted environments.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    persistToken(null);
  }, []);

  const resolveCurrentUser = useCallback(
    async (activeToken: string) => {
      try {
        const me = await getCurrentUser(activeToken);
        setUser(me);
        return me;
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [clearSession]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const me = await getCurrentUser(token);
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    setIsInitializing(true);
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  const register = useCallback(async (payload: RegisterRequest) => {
    return registerUser(payload);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const loginResult = await loginUser({ email, password });
      setToken(loginResult.access_token);
      persistToken(loginResult.access_token);
      return resolveCurrentUser(loginResult.access_token);
    },
    [resolveCurrentUser]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isInitializing,
      register,
      login,
      logout,
    }),
    [user, token, isInitializing, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
