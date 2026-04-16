import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useServerEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        queryClient.invalidateQueries();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);
}
