import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { RegisterPayload, User } from "../types";
import { saveUserToRegistry } from "../lib/platformRegistry";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("uxguard_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem("uxguard_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    localStorage.setItem("uxguard_token", access_token);
    const me = await api.me();
    setUser(me);
    saveUserToRegistry(me);
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const { access_token, user } = await api.register(data);
    localStorage.setItem("uxguard_token", access_token);
    setUser(user);
    saveUserToRegistry(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("uxguard_token");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      saveUserToRegistry(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem("uxguard_token");
        setUser(null);
      }
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const auth = useAuth();
  if (!auth.loading && !auth.user) {
    throw new ApiError(401, "Not authenticated");
  }
  return auth;
}
