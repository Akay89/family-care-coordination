import { Link } from "@tanstack/react-router";
import { CalendarHeart } from "lucide-react";
import type { ReactNode } from "react";

export function PlaceholderNote() {
  return (
    <p className="rounded-xl border-2 border-dashed border-accent bg-accent/10 p-4 text-base">
      <strong>PLACEHOLDER TEXT — please replace.</strong> Everything below is a
      draft outline written for you to rewrite or hand to a solicitor. It is not
      legal advice.
    </p>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
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

      <main className="container-narrow flex-1 py-12">
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Last updated: {updated}
        </p>
        <div className="mt-8 space-y-6 text-lg leading-relaxed">{children}</div>
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

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl">{heading}</h2>
      {children}
    </section>
  );
}
