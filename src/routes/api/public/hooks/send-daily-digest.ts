import { createFileRoute } from "@tanstack/react-router";

import {
  claimAndSend,
  cronAuthFailure,
  jsonResponse,
  londonDateKey,
  londonDayStart,
  londonParts,
  mailLinks,
  plural,
} from "@/lib/reminders.server";

export const Route = createFileRoute("/api/public/hooks/send-daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorised = cronAuthFailure(request);
        if (unauthorised) return unauthorised;

        const now = new Date();
        const localHour = londonParts(now).hour;
        const today = londonDateKey(now);

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { listAuthEmails } = await import("@/lib/email.server");

        const { data: prefs, error: prefsError } = await supabaseAdmin
          .from("notification_preferences")
          .select("user_id, unsubscribe_token")
          .eq("daily_digest", true)
          .eq("digest_hour", localHour);
        if (prefsError) throw prefsError;
        if (!prefs?.length) return jsonResponse({ sent: 0 });

        const userIds = prefs.map((row) => row.user_id);
        const { data: memberships } = await supabaseAdmin
          .from("circle_members")
          .select("circle_id, user_id")
          .in("user_id", userIds);
        const circleIds = [
          ...new Set((memberships ?? []).map((row) => row.circle_id)),
        ];
        if (!circleIds.length) return jsonResponse({ sent: 0 });

        const dayStart = londonDayStart(now);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const [{ data: circles }, { data: events }, { data: tasks }] =
          await Promise.all([
            supabaseAdmin.from("care_circles").select("id, name").in("id", circleIds),
            supabaseAdmin
              .from("events")
              .select("circle_id, assigned_to, start_at")
              .in("circle_id", circleIds)
              .gte("start_at", dayStart.toISOString())
              .lt("start_at", dayEnd.toISOString()),
            supabaseAdmin
              .from("tasks")
              .select("circle_id, assigned_to, due_date")
              .in("circle_id", circleIds)
              .eq("status", "todo")
              .lte("due_date", today),
          ]);

        const circleName = new Map(
          (circles ?? []).map((circle) => [circle.id, circle.name]),
        );
        const emails = await listAuthEmails();

        let sent = 0;
        for (const pref of prefs) {
          const to = emails.get(pref.user_id);
          if (!to) continue;

          const myCircles = (memberships ?? [])
            .filter((row) => row.user_id === pref.user_id)
            .map((row) => row.circle_id);

          const lines: string[] = [];
          for (const circleId of myCircles) {
            const name = circleName.get(circleId) ?? "your care circle";
            const eventCount = (events ?? []).filter(
              (item) => item.circle_id === circleId,
            ).length;
            const myTasks = (tasks ?? []).filter(
              (item) =>
                item.circle_id === circleId && item.assigned_to === pref.user_id,
            ).length;
            const unassigned =
              (events ?? []).filter(
                (item) => item.circle_id === circleId && !item.assigned_to,
              ).length +
              (tasks ?? []).filter(
                (item) => item.circle_id === circleId && !item.assigned_to,
              ).length;

            if (!eventCount && !myTasks && !unassigned) continue;

            const bits: string[] = [];
            if (eventCount) {
              bits.push(
                `${plural(eventCount, "thing", "things")} in the calendar today`,
              );
            }
            if (myTasks) {
              bits.push(`${plural(myTasks, "task", "tasks")} of yours due`);
            }
            if (unassigned) {
              bits.push(
                `${plural(unassigned, "thing", "things")} still needing someone`,
              );
            }
            lines.push(`${name}: ${bits.join(", ")}.`);
          }

          if (!lines.length) continue;

          const links = mailLinks(pref.unsubscribe_token, "/app");
          const ok = await claimAndSend(
            {
              userId: pref.user_id,
              itemType: "digest",
              itemId: null,
              reminderKind: "digest",
              scheduledFor: now,
            },
            {
              to,
              subject: "Your reminders for today",
              bodyHtml: `<p>Good morning,</p>
<ul style="padding-left:20px;margin:16px 0">${lines.map((line) => `<li style="margin-bottom:8px">${line}</li>`).join("")}</ul>
<p>Open CareCircle to see the details.</p>
${links.buttonHtml}`,
              footerHtml: links.footerHtml,
              text: `Good morning,

${lines.join("\n")}

Open CareCircle to see the details.
${links.textTail}`,
            },
          );
          if (ok) sent += 1;
        }

        return jsonResponse({ sent });
      },
    },
  },
});
