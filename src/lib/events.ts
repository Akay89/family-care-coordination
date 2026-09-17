export const eventTypes = [
  "appointment",
  "visit",
  "collection",
  "other",
] as const;

export type EventType = (typeof eventTypes)[number];

export type CircleEvent = {
  id: string;
  circle_id: string;
  title: string;
  type: EventType;
  start_at: string;
  end_at: string | null;
  location: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string;
};

export const eventTypeLabels: Record<EventType, string> = {
  appointment: "Appointment",
  visit: "Visit",
  collection: "Collection",
  other: "Other",
};

export const eventTypeBadgeClass: Record<EventType, string> = {
  appointment: "bg-event-appointment text-event-appointment-foreground",
  visit: "bg-event-visit text-event-visit-foreground",
  collection: "bg-event-collection text-event-collection-foreground",
  other: "bg-event-other text-event-other-foreground",
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dayKey(date: Date) {
  const copy = startOfDay(date);
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, "0")}-${String(copy.getDate()).padStart(2, "0")}`;
}

export function dayHeading(date: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const days = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return target.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRange(start: string, end: string | null) {
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

/** Value for a datetime-local input, in the viewer's own time. */
export function toLocalInput(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function groupByDay(events: CircleEvent[]) {
  const groups = new Map<string, { date: Date; events: CircleEvent[] }>();
  for (const event of events) {
    const date = new Date(event.start_at);
    const key = dayKey(date);
    const group = groups.get(key);
    if (group) group.events.push(event);
    else groups.set(key, { date: startOfDay(date), events: [event] });
  }
  return [...groups.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first weeks
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}
