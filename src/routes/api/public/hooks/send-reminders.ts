import { createFileRoute } from "@tanstack/react-router";

import {
  claimAndSend,
  cronAuthFailure,
  inQuietHours,
  jsonResponse,
  londonDateKey,
  londonParts,
  londonTimeLabel,
  mailLinks,
  plural,
} from "@/lib/reminders.server";

const MINUTE = 60 * 1000;
/** Task reminders go out in the morning; the unique log index keeps it to once a day. */
const TASK_MORNING_HOUR = 8;

type Recipient = { userId: string; circleId: string };

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
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

        const windows = [
          {
            kind: "24h" as const,
            from: new Date(now.getTime() + 24 * 60 * MINUTE),
            to: new Date(now.getTime() + (24 * 60 + 15) * MINUTE),
          },
          {
            kind: "1h" as const,
            from: new Date(now.getTime() + 60 * MINUTE),
            to: new Date(now.getTime() + 75 * MINUTE),
          },
        ];

        const eventBatches = await Promise.all(
          windows.map(async (window) => {
            const { data, error } = await supabaseAdmin
              .from("events")
              .select("id, circle_id, assigned_to, start_at")
              .gte("start_at", window.from.toISOString())
              .lt("start_at", window.to.toISOString());
            if (error) throw error;
            return { kind: window.kind, events: data ?? [] };
          }),
        );

        const { data: dueTasks, error: taskError } =
          localHour === TASK_MORNING_HOUR
            ? await supabaseAdmin
                .from("tasks")
                .select("id, circle_id, assigned_to, due_date")
                .eq("status", "todo")
                .eq("due_date", today)
            : { data: [], error: null };
        if (taskError) throw taskError;

        const circleIds = [
          ...new Set([
            ...eventBatches.flatMap((batch) =>
              batch.events.map((event) => event.circle_id),
            ),
            ...(dueTasks ?? []).map((task) => task.circle_id),
          ]),
        ];

        if (!circleIds.length) return jsonResponse({ sent: 0 });

        const [{ data: members }, { data: circles }] = await Promise.all([
          supabaseAdmin
            .from("circle_members")
            .select("circle_id, user_id, role")
            .in("circle_id", circleIds),
          supabaseAdmin.from("care_circles").select("id, name").in("id", circleIds),
        ]);

        const circleName = new Map(
          (circles ?? []).map((circle) => [circle.id, circle.name]),
        );
        const isMember = (circleId: string, userId: string) =>
          (members ?? []).some(
            (row) => row.circle_id === circleId && row.user_id === userId,
          );
        const organisers = (circleId: string) =>
          (members ?? [])
            .filter((row) => row.circle_id === circleId && row.role === "organiser")
            .map((row) => row.user_id);

        const userIds = [...new Set((members ?? []).map((row) => row.user_id))];
        const [{ data: prefRows }, emails] = await Promise.all([
          supabaseAdmin
            .from("notification_preferences")
            .select(
              "user_id, event_reminder_24h, event_reminder_1h, task_due_reminder, quiet_hours_start, quiet_hours_end, unsubscribe_token",
            )
            .in("user_id", userIds),
          listAuthEmails(),
        ]);
        const prefs = new Map((prefRows ?? []).map((row) => [row.user_id, row]));

        let sent = 0;

        for (const batch of eventBatches) {
          for (const event of batch.events) {
            const recipients: Recipient[] = event.assigned_to
              ? [{ userId: event.assigned_to, circleId: event.circle_id }]
              : organisers(event.circle_id).map((userId) => ({
                  userId,
                  circleId: event.circle_id,
                }));

            for (const recipient of recipients) {
              // Never email about a circle someone has left or been removed from.
              if (!isMember(recipient.circleId, recipient.userId)) continue;

              const pref = prefs.get(recipient.userId);
              if (!pref) continue;
              if (batch.kind === "24h" && !pref.event_reminder_24h) continue;
              if (batch.kind === "1h" && !pref.event_reminder_1h) continue;
              // The one-hour reminder is time-critical, so it ignores quiet hours.
              if (
                batch.kind === "24h" &&
                inQuietHours(
                  localHour,
                  pref.quiet_hours_start,
                  pref.quiet_hours_end,
                )
              ) {
                continue;
              }

              const to = emails.get(recipient.userId);
              if (!to) continue;

              const name = circleName.get(event.circle_id) ?? "your care circle";
              const startsAt = new Date(event.start_at);
              const time = londonTimeLabel(startsAt);
              const when = batch.kind === "24h" ? "Tomorrow" : "In about an hour";
              const who = event.assigned_to
                ? "you have"
                : "there is still nobody down for";
              const line =
                batch.kind === "24h"
                  ? `Tomorrow at ${time} ${who} 1 appointment in ${name}.`
                  : `At ${time} today ${who} 1 appointment in ${name}.`;
              const links = mailLinks(pref.unsubscribe_token, "/app/calendar");

              const ok = await claimAndSend(
                {
                  userId: recipient.userId,
                  itemType: "event",
                  itemId: event.id,
                  reminderKind: batch.kind,
                  scheduledFor: now,
                },
                {
                  to,
                  subject:
                    batch.kind === "24h"
                      ? `Coming up tomorrow in ${name}`
                      : `Coming up shortly in ${name}`,
                  bodyHtml: `<p>Hello,</p>
<p>${line} Open CareCircle to see the details.</p>
${links.buttonHtml}`,
                  footerHtml: links.footerHtml,
                  text: `Hello,

${line} Open CareCircle to see the details.
${links.textTail}`,
                },
              );
              if (ok) sent += 1;
              void when;
            }
          }
        }

        // Tasks due today, grouped per person so each gets a single morning email.
        const taskGroups = new Map<string, { circleId: string; count: number; mine: boolean }[]>();
        const addTask = (
          userId: string,
          circleId: string,
          mine: boolean,
        ) => {
          const list = taskGroups.get(userId) ?? [];
          const existing = list.find(
            (row) => row.circleId === circleId && row.mine === mine,
          );
          if (existing) existing.count += 1;
          else list.push({ circleId, count: 1, mine });
          taskGroups.set(userId, list);
        };

        for (const task of dueTasks ?? []) {
          if (task.assigned_to) {
            addTask(task.assigned_to, task.circle_id, true);
          } else {
            for (const organiser of organisers(task.circle_id)) {
              addTask(organiser, task.circle_id, false);
            }
          }
        }

        for (const [userId, groups] of taskGroups) {
          const pref = prefs.get(userId);
          if (!pref?.task_due_reminder) continue;
          if (
            inQuietHours(localHour, pref.quiet_hours_start, pref.quiet_hours_end)
          ) {
            continue;
          }
          const to = emails.get(userId);
          if (!to) continue;

          const lines = groups
            .filter((group) => isMember(group.circleId, userId))
            .map((group) => {
              const name = circleName.get(group.circleId) ?? "your care circle";
              return group.mine
                ? `You have ${plural(group.count, "task", "tasks")} due today in ${name}.`
                : `${plural(group.count, "task", "tasks")} due today in ${name} still ${group.count === 1 ? "needs" : "need"} someone.`;
            });
          if (!lines.length) continue;

          const links = mailLinks(pref.unsubscribe_token, "/app/tasks");
          const ok = await claimAndSend(
            {
              userId,
              itemType: "task",
              itemId: null,
              reminderKind: "due",
              scheduledFor: now,
            },
            {
              to,
              subject: "Your reminders for today",
              bodyHtml: `<p>Good morning,</p>
<ul style="padding-left:20px;margin:16px 0">${lines.map((line) => `<li style="margin-bottom:8px">${line}</li>`).join("")}</ul>
${links.buttonHtml}`,
              footerHtml: links.footerHtml,
              text: `Good morning,

${lines.join("\n")}
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
