export interface BackendUser {
  id: string;
  email: string;
  roles: string[];
  created_at: string;
}

const defaultApiUrl = import.meta.env.DEV ? '/api' : 'https://app.vitalissy.com.br/api';
const API_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'vitalissy-auth';

interface StoredAuthSession {
  token: string;
  user: BackendUser;
}

export function getStoredAuthSession(): StoredAuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistAuthSession(token: string, user: BackendUser) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getToken() {
  return getStoredAuthSession()?.token ?? null;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, useAuth = true): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;
  const timeoutMs = isFormData ? 60000 : 20000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (useAuth) {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(data.message || 'Erro ao comunicar com a API', response.status);
    }

    return data as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(path: string, useAuth = true) => request<T>(path, { method: 'GET' }, useAuth),
  post: <T>(path: string, body?: unknown, useAuth = true) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      },
      useAuth,
    ),
  put: <T>(path: string, body?: unknown, useAuth = true) =>
    request<T>(
      path,
      {
        method: 'PUT',
        body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      },
      useAuth,
    ),
  patch: <T>(path: string, body?: unknown, useAuth = true) =>
    request<T>(
      path,
      {
        method: 'PATCH',
        body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
      },
      useAuth,
    ),
  delete: <T>(path: string, useAuth = true) => request<T>(path, { method: 'DELETE' }, useAuth),
};
