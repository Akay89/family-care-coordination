import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { CircleEvent } from "@/lib/events";

const eventColumns =
  "id, circle_id, title, type, start_at, end_at, location, notes, assigned_to, created_by";

export function useCircleEvents(circleId: string | undefined) {
  return useQuery({
    queryKey: ["events", circleId],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<CircleEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select(eventColumns)
        .eq("circle_id", circleId!)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CircleEvent[];
    },
  });
}

export function useUpcomingEvents(circleId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: ["events", circleId, "upcoming", limit],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<CircleEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select(eventColumns)
        .eq("circle_id", circleId!)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CircleEvent[];
    },
  });
}

export function useCircleMemberNames(circleId: string | undefined) {
  return useQuery({
    queryKey: ["circle-member-names", circleId],
    enabled: Boolean(circleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("circle_members")
        .select("user_id, role")
        .eq("circle_id", circleId!);
      if (error) throw error;
      const rows = data ?? [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          rows.map((row) => row.user_id),
        );
      const names = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
      );
      return rows.map((row) => ({
        user_id: row.user_id,
        full_name: names.get(row.user_id)?.trim() || "Family member",
      }));
    },
  });
}
