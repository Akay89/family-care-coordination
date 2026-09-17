import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { CircleTask } from "@/lib/tasks";

const taskColumns =
  "id, circle_id, title, description, due_date, assigned_to, status, completed_by, completed_at, recurrence, created_by";

export function useCircleTasks(circleId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", circleId],
    enabled: Boolean(circleId),
    queryFn: async (): Promise<CircleTask[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(taskColumns)
        .eq("circle_id", circleId!)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CircleTask[];
    },
  });
}
