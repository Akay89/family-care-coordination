import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  ChecklistTemplate,
  ChecklistTemplateItem,
  CircleChecklist,
  CircleChecklistItem,
} from "@/lib/checklists";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async (): Promise<boolean> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.is_admin);
    },
  });
}

export function useChecklistTemplates(includeInactive = false) {
  return useQuery({
    queryKey: ["checklist-templates", includeInactive],
    queryFn: async (): Promise<ChecklistTemplate[]> => {
      let query = supabase
        .from("checklist_templates")
        .select("id, title, description, category, is_active")
        .order("created_at", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ChecklistTemplate[];
    },
  });
}

export function useChecklistTemplateItems() {
  return useQuery({
    queryKey: ["checklist-template-items"],
    queryFn: async (): Promise<ChecklistTemplateItem[]> => {
      const { data, error } = await supabase
        .from("checklist_template_items")
        .select("id, template_id, position, title, help_text, link_url")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistTemplateItem[];
    },
  });
}

export function useCircleChecklists(circleId: string | undefined) {
  return useQuery({
    queryKey: ["circle-checklists", circleId],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<CircleChecklist[]> => {
      const { data, error } = await supabase
        .from("circle_checklists")
        .select("id, circle_id, template_id, title, started_by, created_at")
        .eq("circle_id", circleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CircleChecklist[];
    },
  });
}

export function useCircleChecklistItems(checklistIds: string[]) {
  const key = [...checklistIds].sort().join(",");
  return useQuery({
    queryKey: ["circle-checklist-items", key],
    enabled: checklistIds.length > 0,
    queryFn: async (): Promise<CircleChecklistItem[]> => {
      const { data, error } = await supabase
        .from("circle_checklist_items")
        .select(
          "id, circle_checklist_id, position, title, help_text, link_url, is_done, done_by, done_at, notes",
        )
        .in("circle_checklist_id", checklistIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CircleChecklistItem[];
    },
  });
}
