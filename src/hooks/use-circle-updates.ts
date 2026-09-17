import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  CircleUpdate,
  UpdateComment,
  UpdateReaction,
} from "@/lib/updates";

const updateColumns = "id, circle_id, author_id, body, created_at, edited_at";

export function useCircleUpdates(circleId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ["updates", circleId, limit ?? "all"],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<CircleUpdate[]> => {
      let query = supabase
        .from("updates")
        .select(updateColumns)
        .eq("circle_id", circleId!)
        .order("created_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CircleUpdate[];
    },
  });
}

export function useUpdateReactions(updateIds: string[]) {
  const key = [...updateIds].sort().join(",");
  return useQuery({
    queryKey: ["update-reactions", key],
    enabled: updateIds.length > 0,
    queryFn: async (): Promise<UpdateReaction[]> => {
      const { data, error } = await supabase
        .from("update_reactions")
        .select("id, update_id, user_id, emoji")
        .in("update_id", updateIds);
      if (error) throw error;
      return (data ?? []) as UpdateReaction[];
    },
  });
}

export function useUpdateComments(updateIds: string[]) {
  const key = [...updateIds].sort().join(",");
  return useQuery({
    queryKey: ["update-comments", key],
    enabled: updateIds.length > 0,
    queryFn: async (): Promise<UpdateComment[]> => {
      const { data, error } = await supabase
        .from("update_comments")
        .select("id, update_id, author_id, body, created_at")
        .in("update_id", updateIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UpdateComment[];
    },
  });
}

/** Live refresh when anyone in the circle posts, reacts or comments. */
export function useUpdatesRealtime(circleId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`updates:${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "updates",
          filter: `circle_id=eq.${circleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["updates"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "update_reactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["update-reactions"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "update_comments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["update-comments"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, queryClient]);
}
