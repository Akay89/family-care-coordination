import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EventFormSheet } from "@/components/event-form";
import {
  useCircleEvents,
  useCircleMemberNames,
} from "@/hooks/use-circle-events";
import { useCircles } from "@/hooks/use-circles";
import { cn } from "@/lib/utils";
import {
  dayHeading,
  dayKey,
  eventTypeBadgeClass,
  eventTypeLabels,
  formatTimeRange,
  groupByDay,
  monthGrid,
  type CircleEvent,
} from "@/lib/events";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { activeCircle, canEdit } = useCircles();
  const circleId = activeCircle?.id;

  const [view, setView] = useState<"agenda" | "month">("agenda");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CircleEvent | null>(null);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
  });

  const events = useCircleEvents(circleId);
  const members = useCircleMemberNames(circleId);

  const nameFor = useMemo(() => {
    const map = new Map(
      (members.data ?? []).map((member) => [member.user_id, member.full_name]),
    );
    return (userId: string | null) =>
      userId ? (map.get(userId) ?? "Family member") : "Unassigned";
  }, [members.data]);

  const visible = useMemo(() => {
    const all = events.data ?? [];
    if (filter === "mine") {
      return all.filter((event) => event.assigned_to === me.data);
    }
    return all;
  }, [events.data, filter, me.data]);

  async function claim(event: CircleEvent) {
    if (!me.data) return;
    const { error } = await supabase
      .from("events")
      .update({ assigned_to: me.data })
      .eq("id", event.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await events.refetch();
    toast.success("Thank you — that's yours now.");
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(event: CircleEvent) {
    setEditing(event);
    setFormOpen(true);
  }

  if (!activeCircle) {
    return (
      <section>
        <h1 className="text-3xl font-semibold sm:text-4xl">Calendar</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose or create a care circle first.
        </p>
      </section>
    );
  }

  const upcomingGroups = groupByDay(visible);

  return (
    <section className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Calendar</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Appointments, visits and collections for{" "}
            {activeCircle.cared_for_name || activeCircle.name}.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="size-5" aria-hidden="true" />
            Add something
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div
          className="inline-flex rounded-xl border border-border bg-card p-1"
          role="group"
          aria-label="Calendar view"
        >
          {(["agenda", "month"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cn(
                "rounded-lg px-4 py-2 text-base font-medium",
                view === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {option === "agenda" ? "List" : "Month"}
            </button>
          ))}
        </div>

        <div
          className="inline-flex rounded-xl border border-border bg-card p-1"
          role="group"
          aria-label="Filter events"
        >
          {(["all", "mine"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
              className={cn(
                "rounded-lg px-4 py-2 text-base font-medium",
                filter === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {option === "all" ? "All" : "Assigned to me"}
            </button>
          ))}
        </div>
      </div>

      {events.isLoading ? (
        <p className="mt-8 text-base text-muted-foreground">Loading…</p>
      ) : view === "agenda" ? (
        upcomingGroups.length === 0 ? (
          <EmptyState canEdit={canEdit} onAdd={openNew} filter={filter} />
        ) : (
          <div className="mt-8 space-y-8">
            {upcomingGroups.map((group) => (
              <div key={dayKey(group.date)}>
                <h2 className="text-xl font-semibold">
                  {dayHeading(group.date)}
                </h2>
                <ul className="mt-3 space-y-3">
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <EventCard
                        event={event}
                        assignedName={nameFor(event.assigned_to)}
                        canEdit={canEdit}
                        canClaim={canEdit && !event.assigned_to}
                        onEdit={() => openEdit(event)}
                        onClaim={() => void claim(event)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : (
        <MonthView
          month={month}
          events={visible}
          onMonthChange={setMonth}
          onSelect={(event) => canEdit && openEdit(event)}
        />
      )}

      {canEdit && (
        <EventFormSheet
          open={formOpen}
          onOpenChange={setFormOpen}
          circleId={activeCircle.id}
          members={members.data ?? []}
          event={editing}
          onSaved={() => void events.refetch()}
        />
      )}
    </section>
  );
}

function EmptyState({
  canEdit,
  onAdd,
  filter,
}: {
  canEdit: boolean;
  onAdd: () => void;
  filter: "all" | "mine";
}) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
      <span
        className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-soft text-primary"
        aria-hidden="true"
      >
        <CalendarDays className="size-7" />
      </span>
      <p className="mt-4 text-lg font-medium">
        {filter === "mine"
          ? "Nothing is assigned to you yet."
          : "Nothing in the calendar yet."}
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        {canEdit
          ? "Add the next appointment or visit so everyone can see it."
          : "Someone in the circle will add appointments and visits here."}
      </p>
      {canEdit && (
        <Button className="mt-5" onClick={onAdd}>
          <Plus className="size-5" aria-hidden="true" />
          Add something
        </Button>
      )}
    </div>
  );
}

function EventCard({
  event,
  assignedName,
  canEdit,
  canClaim,
  onEdit,
  onClaim,
}: {
  event: CircleEvent;
  assignedName: string;
  canEdit: boolean;
  canClaim: boolean;
  onEdit: () => void;
  onClaim: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
          <h3 className="mt-2 text-xl font-semibold">{event.title}</h3>
          {event.location && (
            <p className="mt-1 text-base text-muted-foreground">
              {event.location}
            </p>
          )}
          <p className="mt-1 text-base text-muted-foreground">
            {event.assigned_to ? assignedName : "Unassigned"}
          </p>
          {event.notes && <p className="mt-3 text-base">{event.notes}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {canClaim && (
            <Button variant="secondary" onClick={onClaim}>
              I can do this
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthView({
  month,
  events,
  onMonthChange,
  onSelect,
}: {
  month: Date;
  events: CircleEvent[];
  onMonthChange: (date: Date) => void;
  onSelect: (event: CircleEvent) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, CircleEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.start_at));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const days = monthGrid(month);
  const todayKey = dayKey(new Date());

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>
        <h2 className="text-xl font-semibold">
          {month.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() =>
            onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-sm text-muted-foreground">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((date) => {
          const key = dayKey(date);
          const dayEvents = byDay.get(key) ?? [];
          const inMonth = date.getMonth() === month.getMonth();
          return (
            <div
              key={key}
              className={cn(
                "min-h-24 rounded-xl border border-border p-1.5 text-left",
                inMonth ? "bg-card" : "bg-muted/40",
                key === todayKey && "border-primary",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  inMonth ? "" : "text-muted-foreground",
                )}
              >
                {date.getDate()}
              </span>
              <ul className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(event)}
                      className={cn(
                        "w-full truncate rounded-md px-1.5 py-1 text-left text-sm",
                        eventTypeBadgeClass[event.type],
                      )}
                    >
                      {formatTimeRange(event.start_at, null)} {event.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
