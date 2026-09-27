import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import api, { setAccessToken as setApiToken, registerRefreshHandler } from "../api/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PM" | "DEVELOPER";
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registerRefreshHandler((token) => {
      setAccessTokenState(token);
    });
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const refreshRes = await api.post("/auth/refresh");
      const token = refreshRes.data.accessToken;
      setApiToken(token);
      setAccessTokenState(token);

      const meRes = await api.get("/auth/me");
      setUser(meRes.data.user);
    } catch (err) {
      // No valid refresh cookie — user genuinely isn't logged in
      setApiToken(null);
      setAccessTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    setApiToken(res.data.accessToken);
    setAccessTokenState(res.data.accessToken);
    setUser(res.data.user);
  }

  async function register(name: string, email: string, password: string) {
    await api.post("/auth/register", { name, email, password });
    await login(email, password);
  }

  async function logout() {
    await api.post("/auth/logout");
    setApiToken(null);
    setAccessTokenState(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}