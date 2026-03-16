import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const RECONNECT_DELAY_MS = 3000;

export function useServerEvents() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      const es = new EventSource("/api/events");
      esRef.current = es;

      es.onmessage = (e) => {
        if (e.data === "connected") return;
        queryClient.invalidateQueries();
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (mountedRef.current) {
          timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    const handleVisibility = () => {
      if (!document.hidden) {
        queryClient.invalidateQueries();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [queryClient]);
}
