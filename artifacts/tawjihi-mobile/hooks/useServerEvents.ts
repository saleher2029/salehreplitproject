import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/utils/api";

const RECONNECT_DELAY = 3000;

export function useServerEvents() {
  const queryClient = useQueryClient();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`${BASE_URL}/api/events`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.body) return;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (mountedRef.current) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: connected") {
                queryClient.invalidateQueries();
              }
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mountedRef.current) {
            retryTimer.current = setTimeout(connect, RECONNECT_DELAY);
          }
        });
    }

    connect();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [queryClient]);
}
