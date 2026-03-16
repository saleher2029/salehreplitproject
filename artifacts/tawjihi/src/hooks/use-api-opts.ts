import { useAuth } from "./use-auth";

export function useApiOpts() {
  const { token } = useAuth();
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  return { request: { headers } } as const;
}
