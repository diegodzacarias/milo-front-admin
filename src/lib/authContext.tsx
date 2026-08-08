import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService, type AuthState, type UserRole } from "@/lib/auth";
import { normalizeApiError } from "@/lib/apiError";

interface AuthContextType extends AuthState {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = authService.getStoredSession();
    const storedToken = authService.getStoredToken();
    if (storedToken && session) {
      setToken(storedToken);
      setUsername(session.username);
      setRole(session.role);
    }
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(username, password);
      authService.saveToken(response, username);
      setToken(response.token);
      setUsername(username);
      setRole(response.role);
    } catch (err) {
      const apiError = normalizeApiError(err, "Error al iniciar sesión");
      setError(apiError.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.clearToken();
    setToken(null);
    setUsername(null);
    setRole(null);
    setError(null);
  };

  const value: AuthContextType = {
    token,
    username,
    role,
    isAdmin: role === "ADMIN",
    login,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
