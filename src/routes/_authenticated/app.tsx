import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { ConsentGate } from "@/components/consent-gate";
import { CirclesProvider, useCircles } from "@/hooks/use-circles";
import { useIdleLogout } from "@/hooks/use-idle-logout";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <CirclesProvider>
      <AppLayout />
    </CirclesProvider>
  ),
});

function AppLayout() {
  const { circles, isLoading, activeCircle, hasInvalidSelection } = useCircles();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useIdleLogout();

  useEffect(() => {
    if (isLoading) return;
    if (hasInvalidSelection) return;
    if (circles.length === 0 && pathname !== "/app/welcome") {
      navigate({ to: "/app/welcome", replace: true });
    }
  }, [circles.length, hasInvalidSelection, isLoading, pathname, navigate]);

  if (hasInvalidSelection) {
    return (
      <AppShell>
        <section data-testid="not-authorised" className="max-w-2xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Not authorised</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            You no longer have access to this care circle.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ConsentGate>
        {activeCircle && pathname !== "/app/welcome" ? (
          <div data-testid="circle-root" data-circle-id={activeCircle.id}>
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </ConsentGate>
    </AppShell>
  );
}
