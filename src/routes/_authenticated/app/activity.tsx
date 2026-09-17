import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCircles } from "@/hooks/use-circles";
import {
  describeActivity,
  formatActivityTime,
  type ActivityRow,
} from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/app/activity")({
  head: () => ({
    meta: [
      { title: "Circle activity · CareCircle" },
      {
        name: "description",
        content:
          "Organisers can see a record of document and people changes in their care circle.",
      },
      { property: "og:title", content: "Circle activity · CareCircle" },
      {
        property: "og:description",
        content: "A record of what has happened in your care circle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { activeCircle, isOrganiser } = useCircles();
  const circleId = activeCircle?.id;

  const activity = useQuery({
    queryKey: ["circle-activity", circleId],
    enabled: Boolean(circleId) && isOrganiser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("circle_id", circleId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as ActivityRow[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", [...new Set(rows.map((row) => row.user_id))]);
      const names = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
      );
      return rows.map((row) => ({
        ...row,
        name: names.get(row.user_id)?.trim() || "Someone",
      }));
    },
  });

  if (!activeCircle) {
    return (
      <section>
        <h1 className="font-display text-3xl sm:text-4xl">Circle activity</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose or create a care circle first.
        </p>
      </section>
    );
  }

  if (!isOrganiser) {
    return (
      <section>
        <h1 className="font-display text-3xl sm:text-4xl">Circle activity</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Only organisers of {activeCircle.name} can see this record.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-3xl">
      <h1 className="font-display text-3xl sm:text-4xl">Circle activity</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        A record of document and people changes in {activeCircle.name}.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <History className="size-5 text-primary" aria-hidden="true" />
          Recent
        </h2>

        {activity.isLoading ? (
          <p className="mt-4 text-base text-muted-foreground">Loading…</p>
        ) : (activity.data ?? []).length === 0 ? (
          <p className="mt-4 text-base text-muted-foreground">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(activity.data ?? []).map((row) => (
              <li key={row.id} className="py-4">
                <p className="text-base">
                  <span className="font-medium">{row.name}</span>{" "}
                  {describeActivity(row)}
                  {row.detail ? (
                    <span className="text-muted-foreground"> — {row.detail}</span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatActivityTime(row.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
