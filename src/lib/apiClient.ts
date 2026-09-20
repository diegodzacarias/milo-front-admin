import { readApiErrorResponse } from "@/lib/apiError";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";
const NORMALIZED_API_BASE_URL = API_BASE_URL.replace(/\/+$/, "");

export type ApiQueryValue = string | number | boolean | null | undefined;

type ApiRequestOptions = RequestInit & {
  query?: Record<string, ApiQueryValue>;
  json?: unknown;
  fallbackMessage?: string;
};

export function buildApiUrl(path: string, query?: Record<string, ApiQueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${NORMALIZED_API_BASE_URL}${normalizedPath}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("milo.auth");
    if (!stored) return null;
    const { token } = JSON.parse(stored);
    return token || null;
  } catch {
    return null;
  }
}

// fetch con Authorization para páginas admin legacy que no pasaron a apiRequest todavía.
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { query, json, fallbackMessage = "Backend request failed.", ...init } = options;
  const headers = new Headers(init.headers);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path, query), {
    ...init,
    headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });

  if (!response.ok) {
    throw await readApiErrorResponse(response, fallbackMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
