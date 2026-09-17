import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, LoadError } from "@/components/data-state";
import { useCircleTasks } from "@/hooks/use-circle-tasks";
import {
  useCircleUpdates,
  useUpdatesRealtime,
} from "@/hooks/use-circle-updates";
import { relativeTime } from "@/lib/updates";
import { dueLabel, isOverdue } from "@/lib/tasks";
import { useCircles } from "@/hooks/use-circles";
import {
  useCircleEvents,
  useCircleMemberNames,
} from "@/hooks/use-circle-events";
import {
  useCircleChecklistItems,
  useCircleChecklists,
} from "@/hooks/use-checklists";
import { cn } from "@/lib/utils";
import {
  dayKey,
  eventTypeBadgeClass,
  eventTypeLabels,
  formatTimeRange,
} from "@/lib/events";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppHome,
});

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  return userId;
}

function useFirstName(userId: string | null) {
  return useQuery({
    queryKey: ["my-first-name", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId!)
        .maybeSingle();
      return data?.full_name?.trim().split(/\s+/)[0] ?? null;
    },
  });
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  message,
  actionTo,
  actionLabel,
}: {
  message: string;
  actionTo: string;
  actionLabel: string;
}) {
  return (
    <div className="mt-3">
      <p className="text-base text-muted-foreground">{message}</p>
      <Button asChild variant="secondary" className="mt-3">
        <Link to={actionTo}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

function AppHome() {
  const { activeCircle, canEdit } = useCircles();
  const circleId = activeCircle?.id;
  const userId = useUserId();
  const firstName = useFirstName(userId);
  const queryClient = useQueryClient();

  const events = useCircleEvents(circleId);
  const tasks = useCircleTasks(circleId);
  const updates = useCircleUpdates(circleId, 1);
  const members = useCircleMemberNames(circleId);
  const checklists = useCircleChecklists(circleId);
  const checklistItems = useCircleChecklistItems(
    (checklists.data ?? []).map((checklist) => checklist.id),
  );
  useUpdatesRealtime(circleId);

  const names = new Map(
    (members.data ?? []).map((member) => [member.user_id, member.full_name]),
  );
  const nameOf = (id: string | null) =>
    id ? (names.get(id) ?? "Family member") : "Unassigned";

  async function claimEvent(eventId: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("events")
      .update({ assigned_to: userId })
      .eq("id", eventId);
    if (error) toast.error("Sorry, that didn't work. Please try again.");
    else await queryClient.invalidateQueries({ queryKey: ["events", circleId] });
  }

  async function claimTask(taskId: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: userId })
      .eq("id", taskId);
    if (error) toast.error("Sorry, that didn't work. Please try again.");
    else await queryClient.invalidateQueries({ queryKey: ["tasks", circleId] });
  }

  const todayKey = dayKey(new Date());
  const allEvents = events.data ?? [];
  const todaysEvents = allEvents.filter(
    (event) => dayKey(new Date(event.start_at)) === todayKey,
  );
  const openTasks = (tasks.data ?? []).filter((task) => task.status === "todo");
  const unassignedEvents = allEvents.filter(
    (event) => !event.assigned_to && new Date(event.start_at) >= new Date(),
  );
  const unassignedTasks = openTasks.filter((task) => !task.assigned_to);
  const myTasks = openTasks.filter((task) => task.assigned_to === userId);
  const latestUpdate = (updates.data ?? [])[0];

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold sm:text-4xl">
        Hello{firstName.data ? `, ${firstName.data}` : ""}
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Here's what's happening in {activeCircle?.name ?? "your care circle"}.
      </p>

      {events.isError || tasks.isError || updates.isError ? (
        <LoadError
          what="today's overview"
          onRetry={() => void queryClient.invalidateQueries()}
        />
      ) : events.isLoading || tasks.isLoading ? (
        <CardListSkeleton rows={4} />
      ) : (
      <div className="mt-8 space-y-5">
        {/* Today */}
        <Card
          title="Today"
          action={
            <Link
              to="/app/calendar"
              className="text-base font-medium text-primary underline"
            >
              Calendar
            </Link>
          }
        >
          {todaysEvents.length === 0 ? (
            <EmptyState
              message="Nothing planned for today."
              actionTo="/app/calendar"
              actionLabel="Add your first appointment"
            />
          ) : (
            <ul className="mt-4 space-y-4">
              {todaysEvents.map((event) => (
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
                    {formatTimeRange(event.start_at, event.end_at)}
                  </span>
                  <span className="text-base">{event.title}</span>
                  <span className="text-base text-muted-foreground">
                    {nameOf(event.assigned_to)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Needs someone */}
        <Card
          title="Needs someone"
          action={
            <Link
              to="/app/tasks"
              className="text-base font-medium text-primary underline"
            >
              Tasks
            </Link>
          }
        >
          {unassignedEvents.length === 0 && unassignedTasks.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">
              Everything has someone. Lovely.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {unassignedEvents.slice(0, 3).map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span className="text-base">
                    {event.title}
                    <span className="text-muted-foreground">
                      {" "}
                      — {dayHeadingShort(event.start_at)},{" "}
                      {formatTimeRange(event.start_at, event.end_at)}
                    </span>
                  </span>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void claimEvent(event.id)}
                    >
                      I can do this
                    </Button>
                  )}
                </li>
              ))}
              {unassignedTasks.slice(0, 4).map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span className="text-base">
                    {task.title}
                    {task.due_date && (
                      <span
                        className={cn(
                          isOverdue(task) && "font-medium text-destructive",
                          !isOverdue(task) && "text-muted-foreground",
                        )}
                      >
                        {" "}
                        — {dueLabel(task.due_date)}
                      </span>
                    )}
                  </span>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void claimTask(task.id)}
                    >
                      Claim
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Your jobs */}
        <Card title="Your jobs">
          {myTasks.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">
              Nothing is assigned to you right now.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myTasks.slice(0, 5).map((task) => (
                <li key={task.id} className="text-base">
                  {task.title}
                  {task.due_date && (
                    <span
                      className={cn(
                        isOverdue(task) && "font-medium text-destructive",
                        !isOverdue(task) && "text-muted-foreground",
                      )}
                    >
                      {" "}
                      — {dueLabel(task.due_date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Latest update */}
        <Card
          title="Latest update"
          action={
            <Link
              to="/app/updates"
              className="text-base font-medium text-primary underline"
            >
              All updates
            </Link>
          }
        >
          {!latestUpdate ? (
            <EmptyState
              message="No updates shared yet. A quick note helps everyone feel in the loop."
              actionTo="/app/updates"
              actionLabel="Share the first update"
            />
          ) : (
            <div className="mt-3">
              <p className="text-base font-medium">
                {nameOf(latestUpdate.author_id)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {relativeTime(latestUpdate.created_at)}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-base">
                {latestUpdate.body}
              </p>
            </div>
          )}
        </Card>

        {/* Checklist progress */}
        <Card
          title="Checklists"
          action={
            <Link
              to="/app/checklists"
              className="text-base font-medium text-primary underline"
            >
              Checklists
            </Link>
          }
        >
          {(checklists.data ?? []).length === 0 ? (
            <EmptyState
              message="Guided checklists help with benefits and paperwork, one step at a time."
              actionTo="/app/checklists"
              actionLabel="Start a checklist"
            />
          ) : (
            <ul className="mt-4 space-y-4">
              {(checklists.data ?? []).map((checklist) => {
                const items = (checklistItems.data ?? []).filter(
                  (item) => item.circle_checklist_id === checklist.id,
                );
                const done = items.filter((item) => item.is_done).length;
                const total = items.length;
                const percent = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <li key={checklist.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        to="/app/checklists"
                        className="text-base font-medium underline"
                      >
                        {checklist.title}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {done} of {total} done
                      </span>
                    </div>
                    <div
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${checklist.title} progress`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      )}
    </section>
  );
}

function dayHeadingShort(value: string) {
  const date = new Date(value);
  const today = new Date();
  const days = Math.round(
    (new Date(date).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000),
  );
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
