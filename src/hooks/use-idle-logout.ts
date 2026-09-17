import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "focus",
] as const;

/** Signs the person out after 30 minutes without any activity. */
export function useIdleLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function signOutIdle() {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.info("We signed you out to keep things private.");
      navigate({ to: "/login", replace: true });
    }

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void signOutIdle(), IDLE_MS);
    }

    reset();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset);
      }
    };
  }, [navigate, queryClient]);
}
