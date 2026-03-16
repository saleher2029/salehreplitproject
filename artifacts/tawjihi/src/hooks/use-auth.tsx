import { createContext, useContext, useState, useEffect } from "react";
import { User, getCurrentUser } from "@workspace/api-client-react";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  try {
    return safeLocalStorage()?.getItem("tawjihi_token") ?? null;
  } catch {
    return null;
  }
}

function setStoredToken(t: string) {
  try { safeLocalStorage()?.setItem("tawjihi_token", t); } catch {}
}

function removeStoredToken() {
  try { safeLocalStorage()?.removeItem("tawjihi_token"); } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setStoredToken(token);
      getCurrentUser({ headers: { Authorization: `Bearer ${token}` } })
        .then(u => setUser(u))
        .catch(() => {
          setToken(null);
          removeStoredToken();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const setAuth = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    setStoredToken(t);
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    removeStoredToken();
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, token, setAuth, clearAuth, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
