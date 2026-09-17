import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "document_uploaded"
  | "document_opened"
  | "document_deleted"
  | "member_role_changed"
  | "member_removed"
  | "invite_created"
  | "invite_accepted";

export type ActivityRow = {
  id: string;
  circle_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

/**
 * Records something that happened in a circle. Best effort: if it fails we never
 * block what the person was actually doing.
 */
export async function logActivity(input: {
  circleId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.from("activity_log").insert({
      circle_id: input.circleId,
      user_id: userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      detail: input.detail ?? null,
    });
  } catch {
    // ignore — the activity log must never get in the way
  }
}

const actionCopy: Record<string, string> = {
  document_uploaded: "added a document",
  document_opened: "opened a document",
  document_deleted: "removed a document",
  member_role_changed: "changed what someone can do",
  member_removed: "removed someone from the circle",
  invite_created: "invited someone",
  invite_accepted: "joined the circle",
};

export function describeActivity(row: ActivityRow) {
  return actionCopy[row.action] ?? row.action.replace(/_/g, " ");
}

export function formatActivityTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
