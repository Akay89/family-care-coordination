import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, ListChecks, Users } from "lucide-react";

import { useCircles } from "@/hooks/use-circles";
import {
  useCircleMemberNames,
  useUpcomingEvents,
} from "@/hooks/use-circle-events";
import { cn } from "@/lib/utils";
import {
  dayHeading,
  eventTypeBadgeClass,
  eventTypeLabels,
  formatTimeRange,
} from "@/lib/events";

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

      <UpcomingEvents circleId={activeCircle?.id} />
      <TaskCards circleId={activeCircle?.id} />


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

function UpcomingEvents({ circleId }: { circleId: string | undefined }) {
  const events = useUpcomingEvents(circleId, 3);
  const members = useCircleMemberNames(circleId);

  if (!circleId || events.isLoading) return null;

  const names = new Map(
    (members.data ?? []).map((member) => [member.user_id, member.full_name]),
  );
  const rows = events.data ?? [];

  return (
    <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Coming up next</h2>
        <Link to="/app/calendar" className="text-base font-medium text-primary underline">
          See the calendar
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">
          Nothing planned yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium",
                  eventTypeBadgeClass[event.type],
                )}
              >
                {eventTypeLabels[event.type]}
              </span>
              <span className="text-base font-medium">
                {dayHeading(new Date(event.start_at))},{" "}
                {formatTimeRange(event.start_at, event.end_at)}
              </span>
              <span className="text-base">{event.title}</span>
              <span className="text-base text-muted-foreground">
                {event.assigned_to
                  ? (names.get(event.assigned_to) ?? "Family member")
                  : "Unassigned"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
