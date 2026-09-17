export const taskRecurrences = ["none", "daily", "weekly", "monthly"] as const;

export type TaskRecurrence = (typeof taskRecurrences)[number];
export type TaskStatus = "todo" | "done";

export type CircleTask = {
  id: string;
  circle_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  recurrence: TaskRecurrence;
  created_by: string;
};

export const recurrenceLabels: Record<TaskRecurrence, string> = {
  none: "Just once",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** due_date is a plain date string (YYYY-MM-DD). */
export function parseDueDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1);
}

export function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isOverdue(task: CircleTask) {
  if (task.status === "done" || !task.due_date) return false;
  return parseDueDate(task.due_date).getTime() < startOfToday().getTime();
}

export function dueLabel(value: string) {
  const due = parseDueDate(value);
  const days = Math.round(
    (due.getTime() - startOfToday().getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days === -1) return "Was due yesterday";
  if (days < 0)
    return `Was due ${due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
  return `Due ${due.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
}

/** "Tue 3pm" style stamp for completed tasks. */
export function completedStamp(value: string) {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-GB", { weekday: "short" });
  let time = date
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s/g, "")
    .toLowerCase();
  time = time.replace(":00", "");
  return `${day} ${time}`;
}

export function nextDueDate(value: string, recurrence: TaskRecurrence) {
  const date = parseDueDate(value);
  if (recurrence === "daily") date.setDate(date.getDate() + 1);
  else if (recurrence === "weekly") date.setDate(date.getDate() + 7);
  else if (recurrence === "monthly") date.setMonth(date.getMonth() + 1);
  else return null;
  return toDateInput(date);
}

export function isThisWeek(value: string) {
  const due = parseDueDate(value).getTime();
  const start = startOfToday().getTime();
  return due >= start && due < start + 7 * 24 * 60 * 60 * 1000;
}
