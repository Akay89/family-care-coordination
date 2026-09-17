import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useChecklistTemplateItems,
  useChecklistTemplates,
  useIsAdmin,
} from "@/hooks/use-checklists";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Checklist admin | CareCircle" },
      {
        name: "description",
        content: "Create and edit the checklist templates offered to care circles.",
      },
      { property: "og:title", content: "Checklist admin | CareCircle" },
      {
        property: "og:description",
        content: "Create and edit the checklist templates offered to care circles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const admin = useIsAdmin();
  const queryClient = useQueryClient();
  const templates = useChecklistTemplates(true);
  const items = useChecklistTemplateItems();

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["checklist-templates"] });
    await queryClient.invalidateQueries({
      queryKey: ["checklist-template-items"],
    });
  }

  async function addTemplate() {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("checklist_templates").insert({
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory.trim() || "general",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewTitle("");
    setNewCategory("");
    setNewDescription("");
    await refresh();
    toast.success("Checklist added");
  }

  async function updateTemplate(
    id: string,
    values: Partial<{ title: string; category: string; description: string; is_active: boolean }>,
  ) {
    const { error } = await supabase
      .from("checklist_templates")
      .update(values)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  }

  async function deleteTemplate(id: string) {
    const { error } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Checklist deleted");
  }

  async function addItem(templateId: string, position: number) {
    const { error } = await supabase.from("checklist_template_items").insert({
      template_id: templateId,
      position,
      title: "New step",
      help_text: "",
      link_url: "https://www.gov.uk/",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  }

  async function updateItem(
    id: string,
    values: Partial<{ title: string; help_text: string | null; link_url: string | null; position: number }>,
  ) {
    const { error } = await supabase
      .from("checklist_template_items")
      .update(values)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  }

  async function deleteItem(id: string) {
    const { error } = await supabase
      .from("checklist_template_items")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  }

  if (admin.isLoading) {
    return (
      <div className="container-page py-10">
        <CardListSkeleton rows={3} className="space-y-3" />
      </div>
    );
  }

  if (!admin.data) {
    return (
      <div className="container-page space-y-4 py-10">
        <h1 className="font-display text-2xl font-semibold">
          This page isn’t available to you
        </h1>
        <p className="text-muted-foreground">
          Only the CareCircle team can edit the shared checklists.
        </p>
        <Button asChild variant="outline">
          <Link to="/app">Back to CareCircle</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page space-y-8 py-8">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to CareCircle
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Checklist admin
        </h1>
        <p className="text-muted-foreground">
          These checklists are offered to every care circle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Add a new checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-title">Title</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-category">Category</Label>
            <Input
              id="new-category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="money, legal, at home…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-description">Description</Label>
            <Textarea
              id="new-description"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
            />
          </div>
          <Button onClick={() => void addTemplate()}>
            <Plus className="size-4" aria-hidden="true" />
            Add checklist
          </Button>
        </CardContent>
      </Card>

      {(templates.data ?? []).map((template) => {
        const rows = (items.data ?? []).filter(
          (item) => item.template_id === template.id,
        );
        return (
          <Card key={template.id}>
            <CardHeader className="gap-3">
              <Input
                defaultValue={template.title}
                aria-label="Checklist title"
                className="font-display text-lg"
                onBlur={(event) =>
                  void updateTemplate(template.id, {
                    title: event.target.value,
                  })
                }
              />
              <Input
                defaultValue={template.category}
                aria-label="Category"
                onBlur={(event) =>
                  void updateTemplate(template.id, {
                    category: event.target.value,
                  })
                }
              />
              <Textarea
                defaultValue={template.description}
                aria-label="Description"
                onBlur={(event) =>
                  void updateTemplate(template.id, {
                    description: event.target.value,
                  })
                }
              />
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={`active-${template.id}`}
                  className="flex items-center gap-2"
                >
                  <Switch
                    id={`active-${template.id}`}
                    checked={template.is_active}
                    onCheckedChange={(value) =>
                      void updateTemplate(template.id, { is_active: value })
                    }
                  />
                  Shown to care circles
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void deleteTemplate(template.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-xl border border-border p-3"
                >
                  <Input
                    defaultValue={item.title}
                    aria-label="Step title"
                    onBlur={(event) =>
                      void updateItem(item.id, { title: event.target.value })
                    }
                  />
                  <Textarea
                    defaultValue={item.help_text ?? ""}
                    aria-label="Help text"
                    onBlur={(event) =>
                      void updateItem(item.id, {
                        help_text: event.target.value || null,
                      })
                    }
                  />
                  <Input
                    defaultValue={item.link_url ?? ""}
                    aria-label="Official link"
                    placeholder="https://www.gov.uk/…"
                    onBlur={(event) =>
                      void updateItem(item.id, {
                        link_url: event.target.value || null,
                      })
                    }
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`pos-${item.id}`} className="text-sm">
                        Order
                      </Label>
                      <Input
                        id={`pos-${item.id}`}
                        type="number"
                        defaultValue={item.position}
                        className="w-20"
                        onBlur={(event) =>
                          void updateItem(item.id, {
                            position: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void deleteItem(item.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Remove step
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => void addItem(template.id, rows.length + 1)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add a step
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
