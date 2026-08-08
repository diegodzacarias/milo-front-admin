import { apiRequest } from "@/lib/apiClient";

export type UserRole = "ADMIN" | "USER";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  expiresAt: string;
}

export interface AuthSession {
  username: string;
  role: UserRole;
}

export interface AuthState {
  token: string | null;
  username: string | null;
  role: UserRole | null;
}

const STORAGE_KEY = "milo.auth";

interface StoredAuth {
  token: string;
  username: string;
  role: UserRole;
  expiresAt: string;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>("/v1/auth/login", {
      method: "POST",
      json: { username, password },
      fallbackMessage: "Error al iniciar sesión. Verifica tus credenciales.",
    });
  },

  getStoredToken(): string | null {
    const stored = readStoredAuth();
    return stored?.token ?? null;
  },

  getStoredSession(): AuthSession | null {
    const stored = readStoredAuth();
    if (!stored) return null;
    return { username: stored.username, role: stored.role };
  },

  saveToken(response: LoginResponse, username: string): void {
    const data: StoredAuth = {
      token: response.token,
      username,
      role: response.role,
      expiresAt: response.expiresAt,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  clearToken(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
