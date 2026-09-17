import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { CirclesProvider, useCircles } from "@/hooks/use-circles";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <CirclesProvider>
      <AppLayout />
    </CirclesProvider>
  ),
});

function AppLayout() {
  const { circles, isLoading } = useCircles();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isLoading) return;
    if (circles.length === 0 && pathname !== "/app/welcome") {
      navigate({ to: "/app/welcome", replace: true });
    }
  }, [circles.length, isLoading, pathname, navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
