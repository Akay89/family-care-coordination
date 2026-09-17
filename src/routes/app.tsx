import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { CalendarHeart } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your CareCircle — coming soon" },
      {
        name: "description",
        content:
          "The CareCircle family space — shared calendar, task rota and checklists — is being prepared.",
      },
      { property: "og:title", content: "Your CareCircle — coming soon" },
      {
        property: "og:description",
        content: "The CareCircle family space is being prepared.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPlaceholder,
});

function AppPlaceholder() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="container-page flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <CalendarHeart className="size-5" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              CareCircle
            </span>
          </div>
          <Link
            to="/"
            className="rounded-full px-4 py-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </header>
      <main className="container-narrow flex flex-1 items-center justify-center py-16 text-center">
        <div>
          <span
            className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-teal-soft text-primary"
            aria-hidden="true"
          >
            <CalendarHeart className="size-8" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Your family space is on its way
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            This is where the shared calendar, task rota and checklists will
            live. We&apos;re putting the finishing touches on it now — sign-in
            arrives next.
          </p>
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
