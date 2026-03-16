export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export interface ApiError {
  message: string;
  status?: number;
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string | null }
): Promise<T> {
  const { token, headers: extraHeaders, ...fetchOptions } = options ?? {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders as Record<string, string> ?? {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error || body?.message || `خطأ ${response.status}`;
    const err = new Error(message) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}
