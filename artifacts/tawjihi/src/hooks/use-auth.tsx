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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("tawjihi_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem("tawjihi_token", token);
      getCurrentUser({ headers: { Authorization: `Bearer ${token}` } })
        .then(u => setUser(u))
        .catch(() => {
          setToken(null);
          localStorage.removeItem("tawjihi_token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const setAuth = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("tawjihi_token", t);
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("tawjihi_token");
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
