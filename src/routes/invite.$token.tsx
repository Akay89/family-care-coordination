import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarHeart } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { previewInvite } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join a care circle · CareCircle" },
      {
        name: "description",
        content:
          "Accept your invite and join a private CareCircle to help share the practical admin of caring for someone.",
      },
      { property: "og:title", content: "Join a care circle on CareCircle" },
      {
        property: "og:description",
        content: "Accept your invite and start sharing the care admin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

type State =
  | { status: "loading" }
  | { status: "signin"; circleName: string }
  | { status: "error"; message: string }
  | { status: "joined"; circleName: string };

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function run() {
      const invite = await previewInvite({ data: { token } }).catch(() => null);
      if (!active) return;

      if (!invite) {
        setState({
          status: "error",
          message: "We couldn't find that invite. Ask for a fresh link.",
        });
        return;
      }
      if (!invite.valid) {
        setState({
          status: "error",
          message:
            "This invite link has expired or has already been used. Ask for a fresh one.",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      if (!userData.user) {
        setState({ status: "signin", circleName: invite.circle_name });
        return;
      }

      const { error: joinError } = await supabase.rpc("accept_circle_invite", {
        _token: token,
      });
      if (!active) return;
      if (joinError) {
        setState({ status: "error", message: joinError.message });
        return;
      }
      window.localStorage.setItem("carecircle:last-circle", invite.circle_id);
      await logActivity({
        circleId: invite.circle_id,
        action: "invite_accepted",
        entityType: "circle_member",
      });
      setState({ status: "joined", circleName: invite.circle_name });
    }

    void run();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="container-page flex items-center py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <CalendarHeart className="size-5" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              CareCircle
            </span>
          </Link>
        </div>
      </header>

      <main className="container-narrow flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          {state.status === "loading" && (
            <p className="text-lg text-muted-foreground">
              Checking your invite…
            </p>
          )}

          {state.status === "signin" && (
            <>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                You&apos;ve been invited to “{state.circleName}”
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                Sign in or create a free account, and we&apos;ll add you to the
                circle straight away.
              </p>
              <Button
                data-testid="accept-invite"
                className="mt-6 w-full"
                onClick={() =>
                  navigate({
                    to: "/login",
                    search: { redirect: `/invite/${token}` },
                  })
                }
              >
                Continue
              </Button>
            </>
          )}

          {state.status === "joined" && (
            <>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                You&apos;re in
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                You&apos;ve joined “{state.circleName}”.
              </p>
              <Button
                className="mt-6 w-full"
                onClick={() => navigate({ to: "/app", replace: true })}
              >
                Go to your circle
              </Button>
            </>
          )}

          {state.status === "error" && (
            <div data-testid="invite-invalid">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                That invite didn&apos;t work
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                {state.message}
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => navigate({ to: "/" })}
              >
                Back to the home page
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="container-page py-6">
          <p className="text-base text-muted-foreground">
            CareCircle does not provide medical advice. In an emergency call 999.
          </p>
        </div>
      </footer>
    </div>
  );
}
