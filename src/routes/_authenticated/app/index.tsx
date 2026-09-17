import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, ListChecks, Users } from "lucide-react";

import { useCircles } from "@/hooks/use-circles";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppHome,
});

const shortcuts = [
  {
    to: "/app/calendar",
    label: "Shared calendar",
    description: "Appointments, visits and who's covering them.",
    icon: CalendarDays,
  },
  {
    to: "/app/tasks",
    label: "Task rota",
    description: "Share the jobs so nothing lands on one person.",
    icon: CheckSquare,
  },
  {
    to: "/app/checklists",
    label: "Checklists",
    description: "Step-by-step help with benefits and paperwork.",
    icon: ListChecks,
  },
  {
    to: "/app/members",
    label: "People",
    description: "See who's helping and invite more family or friends.",
    icon: Users,
  },
] as const;

function AppHome() {
  const { activeCircle } = useCircles();

  return (
    <section>
      <h1 className="text-3xl font-semibold sm:text-4xl">
        {activeCircle?.name ?? "Home"}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {activeCircle
          ? `Everything the family is coordinating for ${activeCircle.cared_for_name || "your relative"}.`
          : "Welcome to your family space."}
      </p>

      {activeCircle?.cared_for_notes && (
        <p className="mt-4 max-w-2xl rounded-2xl border border-border bg-card p-4 text-base">
          {activeCircle.cared_for_notes}
        </p>
      )}


      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl bg-teal-soft text-primary"
              aria-hidden="true"
            >
              <item.icon className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">{item.label}</h2>
            <p className="mt-2 text-base text-muted-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
