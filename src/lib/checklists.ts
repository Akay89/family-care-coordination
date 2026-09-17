export const CHECKLIST_NOTICE =
  "This is general guidance, not legal, financial or medical advice. Always check the official GOV.UK or NHS page linked.";

export type ChecklistTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  is_active: boolean;
};

export type ChecklistTemplateItem = {
  id: string;
  template_id: string;
  position: number;
  title: string;
  help_text: string | null;
  link_url: string | null;
};

export type CircleChecklist = {
  id: string;
  circle_id: string;
  template_id: string | null;
  title: string;
  started_by: string;
  created_at: string;
};

export type CircleChecklistItem = {
  id: string;
  circle_checklist_id: string;
  position: number;
  title: string;
  help_text: string | null;
  link_url: string | null;
  is_done: boolean;
  done_by: string | null;
  done_at: string | null;
  notes: string | null;
};

export function progressLabel(items: CircleChecklistItem[]) {
  const done = items.filter((item) => item.is_done).length;
  return `${done} of ${items.length} done`;
}

export function progressPercent(items: CircleChecklistItem[]) {
  if (items.length === 0) return 0;
  return Math.round(
    (items.filter((item) => item.is_done).length / items.length) * 100,
  );
}

export function formatDoneAt(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
