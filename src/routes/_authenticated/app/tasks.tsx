import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TaskFormSheet } from "@/components/task-form";
import { CardListSkeleton, LoadError } from "@/components/data-state";
import { useCircles } from "@/hooks/use-circles";
import { useCircleMemberNames } from "@/hooks/use-circle-events";
import { useCircleTasks } from "@/hooks/use-circle-tasks";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  completedStamp,
  dueLabel,
  isOverdue,
  nextDueDate,
  recurrenceLabels,
  toDateInput,
  type CircleTask,
} from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: TasksPage,
});

type Filter = "all" | "mine" | "unassigned";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
];

function TasksPage() {
  const { activeCircle, canEdit } = useCircles();
  const circleId = activeCircle?.id;
  const queryClient = useQueryClient();
  const tasks = useCircleTasks(circleId);
  const members = useCircleMemberNames(circleId);

  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [quickAdd, setQuickAdd] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<CircleTask | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const names = useMemo(
    () =>
      new Map(
        (members.data ?? []).map((member) => [member.user_id, member.full_name]),
      ),
    [members.data],
  );

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const rows = (tasks.data ?? []).filter((task) => {
    if (filter === "mine") return task.assigned_to === userId;
    if (filter === "unassigned") return !task.assigned_to;
    return true;
  });

  const overdue = rows.filter(isOverdue);
  const upcoming = rows.filter(
    (task) => task.status === "todo" && !isOverdue(task),
  );
  const done = rows
    .filter((task) => task.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  async function handleQuickAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = quickAdd.trim();
    if (!title || !circleId || !userId) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .insert({ circle_id: circleId, title, created_by: userId });
      if (error) throw error;
      setQuickAdd("");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sorry, we couldn't add that.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function toggleDone(task: CircleTask, done: boolean) {
    if (!userId) return;
    try {
      if (done) {
        const { error } = await supabase
          .from("tasks")
          .update({
            status: "done",
            completed_by: userId,
            completed_at: new Date().toISOString(),
          })
          .eq("id", task.id);
        if (error) throw error;

        if (task.recurrence !== "none") {
          const base = task.due_date ?? toDateInput(new Date());
          const { error: nextError } = await supabase.from("tasks").insert({
            circle_id: task.circle_id,
            title: task.title,
            description: task.description,
            due_date: nextDueDate(base, task.recurrence),
            assigned_to: task.assigned_to,
            recurrence: task.recurrence,
            created_by: userId,
          });
          if (nextError) throw nextError;
          toast.success("Ticked off — the next one is on the list.");
        }
      } else {
        const { error } = await supabase
          .from("tasks")
          .update({ status: "todo", completed_by: null, completed_at: null })
          .eq("id", task.id);
        if (error) throw error;
      }
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sorry, we couldn't save that.",
      );
    }
  }

  async function claim(task: CircleTask) {
    if (!userId) return;
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: userId })
      .eq("id", task.id);
    if (error) {
      toast.error("Sorry, we couldn't save that.");
      return;
    }
    toast.success("Thank you — that's yours now.");
    await refresh();
  }

  async function remove(task: CircleTask) {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("Sorry, we couldn't remove that.");
      return;
    }
    await refresh();
  }

  function renderTask(task: CircleTask) {
    const assignee = task.assigned_to
      ? (names.get(task.assigned_to) ?? "Family member")
      : null;

    return (
      <li
        key={task.id}
        data-testid="task-row"
        className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <Checkbox
          data-testid="task-checkbox"
          checked={task.status === "done"}
          disabled={!canEdit}
          className="mt-1 size-6"
          aria-label={
            task.status === "done"
              ? `Mark ${task.title} as still to do`
              : `Mark ${task.title} as done`
          }
          onCheckedChange={(checked) => toggleDone(task, checked === true)}
        />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-lg font-medium",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-base text-muted-foreground">
              {task.description}
            </p>
          )}
          <p className="mt-1 flex flex-wrap gap-x-3 text-base text-muted-foreground">
            {task.due_date && <span>{dueLabel(task.due_date)}</span>}
            <span>{assignee ? assignee : "Nobody yet"}</span>
            {task.recurrence !== "none" && (
              <span>{recurrenceLabels[task.recurrence]}</span>
            )}
            {task.status === "done" && task.completed_at && (
              <span>
                Done by{" "}
                {task.completed_by
                  ? (names.get(task.completed_by) ?? "a family member")
                  : "a family member"}
                , {completedStamp(task.completed_at)}
              </span>
            )}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {task.status === "todo" && !task.assigned_to && (
              <Button data-testid="task-claim" size="sm" onClick={() => claim(task)}>
                Claim
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditing(task)}>
              Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${task.title}`}
              onClick={() => remove(task)}
            >
              <Trash2 className="size-5" />
            </Button>
          </div>
        )}
      </li>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold sm:text-4xl">Tasks</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        A simple rota so the practical jobs are shared fairly.
      </p>

      {canEdit && (
        <form data-testid="task-quick-add" onSubmit={handleQuickAdd} className="mt-6 flex max-w-2xl gap-3">
          <Input
            value={quickAdd}
            placeholder="Add a task and press enter"
            aria-label="Add a task"
            onChange={(e) => setQuickAdd(e.target.value)}
          />
          <Button type="submit" disabled={adding || quickAdd.trim() === ""}>
            Add
          </Button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? "default" : "outline"}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {tasks.isError ? (
        <LoadError what="your tasks" onRetry={() => void refresh()} />
      ) : tasks.isLoading ? (
        <CardListSkeleton rows={4} />
      ) : (
        <div className="mt-8 max-w-3xl space-y-8">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold">Overdue</h2>
              <ul className="mt-3 space-y-3">{overdue.map(renderTask)}</ul>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">
                Nothing on the list right now.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">{upcoming.map(renderTask)}</ul>
            )}
          </div>

          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-xl font-semibold"
              aria-expanded={showDone}
              onClick={() => setShowDone((value) => !value)}
            >
              Done ({done.length})
              <ChevronDown
                className={cn("size-5 transition-transform", showDone && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {showDone &&
              (done.length === 0 ? (
                <p className="mt-3 text-base text-muted-foreground">
                  Nothing ticked off yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">{done.map(renderTask)}</ul>
              ))}
          </div>
        </div>
      )}

      <TaskFormSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        members={members.data ?? []}
        task={editing}
        onSaved={refresh}
      />
    </section>
  );
}
