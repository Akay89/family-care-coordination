import { createFileRoute } from "@tanstack/react-router";

const LONDON = "Europe/London";

/** London wall-clock parts for an instant. */
function londonParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** UTC instant of midnight London on the London date of `at`. */
function londonDayStart(at: Date) {
  const p = londonParts(at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const offsetMs = asUtc - at.getTime();
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offsetMs);
}

function dateKey(at: Date) {
  const p = londonParts(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export const Route = createFileRoute("/api/public/hooks/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        const token = request.headers
          .get("authorization")
          ?.replace(/^Bearer /, "");
        if (!secret || token !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorised" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let body: { force?: boolean } = {};
        try {
          body = (await request.json()) as { force?: boolean };
        } catch {
          body = {};
        }

        const now = new Date();
        if (!body.force && londonParts(now).hour !== 7) {
          return new Response(
            JSON.stringify({ skipped: "not_7am_london" }),
            { headers: { "content-type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { sendEmail, appBaseUrl, listAuthEmails } = await import(
          "@/lib/email.server"
        );

        const dayStart = londonDayStart(now);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const today = dateKey(now);

        const { data: prefs, error: prefsError } = await supabaseAdmin
          .from("notification_preferences")
          .select("user_id, unsubscribe_token")
          .eq("daily_digest", true);
        if (prefsError) throw prefsError;
        if (!prefs?.length) {
          return new Response(JSON.stringify({ sent: 0 }), {
            headers: { "content-type": "application/json" },
          });
        }

        const userIds = prefs.map((row) => row.user_id);
        const { data: memberships } = await supabaseAdmin
          .from("circle_members")
          .select("circle_id, user_id")
          .in("user_id", userIds);
        const circleIds = [
          ...new Set((memberships ?? []).map((row) => row.circle_id)),
        ];
        if (!circleIds.length) {
          return new Response(JSON.stringify({ sent: 0 }), {
            headers: { "content-type": "application/json" },
          });
        }

        const [{ data: circles }, { data: events }, { data: tasks }] =
          await Promise.all([
            supabaseAdmin
              .from("care_circles")
              .select("id, name")
              .in("id", circleIds),
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
            const mine =
              (events ?? []).filter(
                (item) =>
                  item.circle_id === circleId &&
                  item.assigned_to === pref.user_id,
              ).length +
              (tasks ?? []).filter(
                (item) =>
                  item.circle_id === circleId &&
                  item.assigned_to === pref.user_id,
              ).length;
            const needsSomeone =
              (events ?? []).filter(
                (item) => item.circle_id === circleId && !item.assigned_to,
              ).length +
              (tasks ?? []).filter(
                (item) => item.circle_id === circleId && !item.assigned_to,
              ).length;

            if (!mine && !needsSomeone) continue;
            const bits: string[] = [];
            if (mine) {
              bits.push(
                `You have ${plural(mine, "thing", "things")} today in ${name}.`,
              );
            }
            if (needsSomeone) {
              bits.push(
                `${plural(needsSomeone, "thing", "things")} still ${needsSomeone === 1 ? "needs" : "need"} someone in ${name}.`,
              );
            }
            lines.push(`<li style="margin-bottom:8px">${bits.join(" ")}</li>`);
          }

          if (!lines.length) continue;

          const unsubscribe = `${appBaseUrl()}/api/public/unsubscribe?token=${pref.unsubscribe_token}`;
          const result = await sendEmail({
            to,
            subject: "Your CareCircle summary for today",
            bodyHtml: `<p>Good morning,</p>
<ul style="padding-left:20px;margin:16px 0">${lines.join("")}</ul>
<p><a href="${appBaseUrl()}/app" style="display:inline-block;background:#2f6f6a;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none">Open CareCircle</a></p>`,
            footerHtml: `<p style="font-size:14px;color:#6b6560"><a href="${unsubscribe}" style="color:#6b6560">Stop these daily emails</a></p>`,
          });
          if (result.sent) sent += 1;
        }

        return new Response(JSON.stringify({ sent }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
