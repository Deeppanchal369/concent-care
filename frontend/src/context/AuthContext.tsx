import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";

interface AuthUser {
  username: string;
  role: string;
  fullName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("cc_user");
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser());

  useEffect(() => {
    // client.ts dispatches this when the backend reports an expired or
    // invalid token (401) -- clears the React state too, so RequireAuth
    // (App.tsx) sees user === null and redirects to /login, instead of
    // leaving the page stuck showing stale data with a dead session.
    function handleExpired() {
      setUser(null);
    }
    window.addEventListener("cc:session-expired", handleExpired);
    return () => window.removeEventListener("cc:session-expired", handleExpired);
  }, []);

  function persist(token: string, u: AuthUser) {
    localStorage.setItem("cc_token", token);
    localStorage.setItem("cc_user", JSON.stringify(u));
    setUser(u);
  }

  async function login(username: string, password: string) {
    const res = await api.login({ username, password });
    persist(res.token, { username: res.username, role: res.role, fullName: res.fullName });
  }

  async function register(data: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  }) {
    const res = await api.register(data);
    persist(res.token, { username: res.username, role: res.role, fullName: res.fullName });
  }

  function logout() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
