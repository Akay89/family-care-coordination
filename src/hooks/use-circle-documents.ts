import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { CircleDocument } from "@/lib/documents";

const columns =
  "id, circle_id, file_path, file_name, category, description, uploaded_by, size_bytes, created_at";

export function useCircleDocuments(circleId: string | undefined) {
  return useQuery({
    queryKey: ["documents", circleId],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<CircleDocument[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select(columns)
        .eq("circle_id", circleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CircleDocument[];
    },
  });
}

export function useCircleMemberNames(circleId: string | undefined) {
  return useQuery({
    queryKey: ["circle-member-names", circleId],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<Record<string, string>> => {
      const { data: members, error } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", circleId!);
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      if (ids.length === 0) return {};
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      if (profileError) throw profileError;
      const map: Record<string, string> = {};
      for (const profile of profiles ?? []) {
        map[profile.id] = profile.full_name || "Someone in the circle";
      }
      return map;
    },
  });
}
