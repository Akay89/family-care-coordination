import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Info, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCircles } from "@/hooks/use-circles";
import { useCircleMemberNames } from "@/hooks/use-circle-events";
import {
  useChecklistTemplateItems,
  useChecklistTemplates,
  useCircleChecklistItems,
  useCircleChecklists,
} from "@/hooks/use-checklists";
import {
  CHECKLIST_NOTICE,
  formatDoneAt,
  progressLabel,
  progressPercent,
  type CircleChecklistItem,
} from "@/lib/checklists";

export const Route = createFileRoute("/_authenticated/app/checklists")({
  head: () => ({
    meta: [
      { title: "Checklists | CareCircle" },
      {
        name: "description",
        content:
          "Step-by-step checklists for benefits, paperwork and other UK care admin, shared with your circle.",
      },
      { property: "og:title", content: "Checklists | CareCircle" },
      {
        property: "og:description",
        content:
          "Step-by-step checklists for benefits, paperwork and other UK care admin, shared with your circle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChecklistsPage,
});

function Notice() {
  return (
    <p className="flex gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{CHECKLIST_NOTICE}</span>
    </p>
  );
}

function ChecklistsPage() {
  const { activeCircle, canEdit } = useCircles();
  const circleId = activeCircle?.id;
  const queryClient = useQueryClient();

  const templates = useChecklistTemplates();
  const templateItems = useChecklistTemplateItems();
  const checklists = useCircleChecklists(circleId);
  const ids = (checklists.data ?? []).map((c) => c.id);
  const items = useCircleChecklistItems(ids);
  const members = useCircleMemberNames(circleId);

  const [userId, setUserId] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const names = useMemo(
    () =>
      new Map(
        (members.data ?? []).map((member) => [member.user_id, member.full_name]),
      ),
    [members.data],
  );

  const byChecklist = useMemo(() => {
    const map = new Map<string, CircleChecklistItem[]>();
    for (const item of items.data ?? []) {
      const list = map.get(item.circle_checklist_id) ?? [];
      list.push(item);
      map.set(item.circle_checklist_id, list);
    }
    return map;
  }, [items.data]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["circle-checklists"] });
    await queryClient.invalidateQueries({
      queryKey: ["circle-checklist-items"],
    });
  }

  async function startChecklist(templateId: string) {
    if (!circleId || !userId) return;
    const template = (templates.data ?? []).find((t) => t.id === templateId);
    if (!template) return;
    setStarting(templateId);
    try {
      const checklistId = crypto.randomUUID();
      const { error } = await supabase.from("circle_checklists").insert({
        id: checklistId,
        circle_id: circleId,
        template_id: templateId,
        title: template.title,
        started_by: userId,
      });
      if (error) throw error;

      const source = (templateItems.data ?? []).filter(
        (item) => item.template_id === templateId,
      );
      if (source.length > 0) {
        const { error: itemsError } = await supabase
          .from("circle_checklist_items")
          .insert(
            source.map((item) => ({
              circle_checklist_id: checklistId,
              position: item.position,
              title: item.title,
              help_text: item.help_text,
              link_url: item.link_url,
            })),
          );
        if (itemsError) throw itemsError;
      }
      await refresh();
      toast.success(`Added "${template.title}" to this care circle`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start that checklist",
      );
    } finally {
      setStarting(null);
    }
  }

  async function toggleItem(item: CircleChecklistItem, done: boolean) {
    if (!userId) return;
    const { error } = await supabase
      .from("circle_checklist_items")
      .update({
        is_done: done,
        done_by: done ? userId : null,
        done_at: done ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    if (error) {
      toast.error("Could not update that step");
      return;
    }
    await refresh();
  }

  async function saveNotes(item: CircleChecklistItem, notes: string) {
    const value = notes.trim() || null;
    if (value === (item.notes ?? null)) return;
    const { error } = await supabase
      .from("circle_checklist_items")
      .update({ notes: value })
      .eq("id", item.id);
    if (error) {
      toast.error("Could not save that note");
      return;
    }
    await refresh();
  }

  async function removeChecklist(id: string) {
    const { error } = await supabase
      .from("circle_checklists")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Could not remove that checklist");
      return;
    }
    await refresh();
    toast.success("Checklist removed");
  }

  if (!activeCircle) {
    return (
      <p className="text-muted-foreground">
        Choose a care circle to see its checklists.
      </p>
    );
  }

  const started = checklists.data ?? [];
  const startedTemplateIds = new Set(
    started.map((c) => c.template_id).filter(Boolean) as string[],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Checklists
        </h1>
        <p className="text-muted-foreground">
          Work through the practical steps together, at your own pace.
        </p>
      </header>

      <Notice />

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Your checklists
        </h2>
        {checklists.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : started.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing started yet. Pick one from the list below.
          </p>
        ) : (
          started.map((checklist) => {
            const rows = byChecklist.get(checklist.id) ?? [];
            return (
              <Card key={checklist.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="font-display text-xl">
                      {checklist.title}
                    </CardTitle>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void removeChecklist(checklist.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">
                      {progressLabel(rows)}
                    </p>
                    <Progress value={progressPercent(rows)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rows.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-xl border border-border p-3"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={item.is_done}
                          disabled={!canEdit}
                          onCheckedChange={(value) =>
                            void toggleItem(item, value === true)
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <label
                            htmlFor={`item-${item.id}`}
                            className="block text-base font-medium"
                          >
                            {item.title}
                          </label>
                          {item.help_text && (
                            <p className="text-sm text-muted-foreground">
                              {item.help_text}
                            </p>
                          )}
                          {item.link_url && (
                            <a
                              href={item.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline"
                            >
                              Official guidance
                              <ExternalLink
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </a>
                          )}
                          {item.is_done && item.done_by && (
                            <p className="text-sm text-muted-foreground">
                              Done by{" "}
                              {names.get(item.done_by) ?? "someone in the circle"}
                              , {formatDoneAt(item.done_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {item.notes ? "Note added" : "Add a note"}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <Textarea
                            defaultValue={item.notes ?? ""}
                            disabled={!canEdit}
                            placeholder="Anything the rest of the circle should know"
                            onBlur={(event) =>
                              void saveNotes(item, event.target.value)
                            }
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Checklists you can start
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(templates.data ?? []).map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {template.category}
                </p>
                <CardTitle className="font-display text-xl">
                  <span className="flex items-start gap-2">
                    <ListChecks
                      className="mt-1 size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {template.title}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">{template.description}</p>
                {canEdit ? (
                  <Button
                    onClick={() => void startChecklist(template.id)}
                    disabled={starting === template.id}
                  >
                    {startedTemplateIds.has(template.id)
                      ? "Start again"
                      : "Start this checklist"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Viewers can read checklists but not start them.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
