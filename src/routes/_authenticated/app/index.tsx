import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, ListChecks, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useCircleTasks } from "@/hooks/use-circle-tasks";
import {
  useCircleUpdates,
  useUpdatesRealtime,
} from "@/hooks/use-circle-updates";
import { relativeTime } from "@/lib/updates";
import { dueLabel, isThisWeek } from "@/lib/tasks";
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
      <LatestUpdate circleId={activeCircle?.id} />


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

function TaskCards({ circleId }: { circleId: string | undefined }) {
  const tasks = useCircleTasks(circleId);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!circleId || tasks.isLoading) return null;

  const open = (tasks.data ?? []).filter((task) => task.status === "todo");
  const unassigned = open.filter((task) => !task.assigned_to);
  const mine = open.filter(
    (task) =>
      task.assigned_to === userId && task.due_date && isThisWeek(task.due_date),
  );

  return (
    <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {unassigned.length === 0
              ? "Everything has someone"
              : `${unassigned.length} ${unassigned.length === 1 ? "task needs" : "tasks need"} someone`}
          </h2>
          <Link to="/app/tasks" className="text-base font-medium text-primary underline">
            Tasks
          </Link>
        </div>
        {unassigned.length > 0 && (
          <ul className="mt-3 space-y-2">
            {unassigned.slice(0, 4).map((task) => (
              <li key={task.id} className="text-base">
                {task.title}
                {task.due_date && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {dueLabel(task.due_date)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Your tasks this week</h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-base text-muted-foreground">
            Nothing due from you this week.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.slice(0, 4).map((task) => (
              <li key={task.id} className="text-base">
                {task.title}
                <span className="text-muted-foreground">
                  {" "}
                  — {dueLabel(task.due_date!)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LatestUpdate({ circleId }: { circleId: string | undefined }) {
  const updates = useCircleUpdates(circleId, 1);
  const members = useCircleMemberNames(circleId);
  useUpdatesRealtime(circleId);

  if (!circleId || updates.isLoading) return null;

  const latest = (updates.data ?? [])[0];
  const names = new Map(
    (members.data ?? []).map((member) => [member.user_id, member.full_name]),
  );

  return (
    <div className="mt-6 max-w-2xl rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Latest update</h2>
        <Link to="/app/updates" className="text-base font-medium text-primary underline">
          All updates
        </Link>
      </div>
      {!latest ? (
        <p className="mt-3 text-base text-muted-foreground">
          No updates shared yet.
        </p>
      ) : (
        <div className="mt-3">
          <p className="text-base font-medium">
            {names.get(latest.author_id) ?? "Family member"}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {relativeTime(latest.created_at)}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-base">{latest.body}</p>
        </div>
      )}
    </div>
  );
}
