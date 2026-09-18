/** Server-only helpers for scheduled reminder emails. Never import from client code. */

import { appBaseUrl, sendEmail } from "@/lib/email.server";

export const LONDON = "Europe/London";

/** London wall-clock parts for an instant. */
export function londonParts(at: Date) {
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
export function londonDayStart(at: Date) {
  const p = londonParts(at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const offsetMs = asUtc - at.getTime();
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offsetMs);
}

/** London calendar date, as YYYY-MM-DD. */
export function londonDateKey(at: Date) {
  const p = londonParts(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** e.g. "2:00pm" in London time. */
export function londonTimeLabel(at: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(at)
    .replace(/\s/g, "")
    .toLowerCase();
}

/** True when `hour` falls inside a quiet-hours window that may wrap midnight. */
export function inQuietHours(hour: number, start: number, end: number) {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export type LogRow = {
  userId: string;
  itemType: "event" | "task" | "digest";
  itemId: string | null;
  reminderKind: "24h" | "1h" | "due" | "digest";
  scheduledFor: Date;
};

export type MailParts = {
  to: string;
  subject: string;
  bodyHtml: string;
  footerHtml?: string;
  text: string;
};

/**
 * Claims the reminder in notification_log (the unique index makes this safe to
 * retry), sends it, then records the outcome. Returns true when an email went out.
 */
export async function claimAndSend(log: LogRow, mail: MailParts) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("notification_log")
    .insert({
      user_id: log.userId,
      item_type: log.itemType,
      item_id: log.itemId,
      reminder_kind: log.reminderKind,
      scheduled_for: log.scheduledFor.toISOString(),
      scheduled_date: londonDateKey(log.scheduledFor),
      status: "skipped",
    })
    .select("id")
    .maybeSingle();

  if (claimError) {
    // 23505 = unique violation: this reminder has already been handled.
    if (claimError.code === "23505") return false;
    console.error("notification_log insert failed", claimError);
    return false;
  }
  if (!claimed) return false;

  const result = await sendEmail({
    to: mail.to,
    subject: mail.subject,
    bodyHtml: mail.bodyHtml,
    footerHtml: mail.footerHtml ?? "",
    text: mail.text,
  });

  await supabaseAdmin
    .from("notification_log")
    .update({
      status: result.sent ? "sent" : "failed",
      sent_at: result.sent ? new Date().toISOString() : null,
      error_text: result.sent ? null : (result.reason ?? "unknown"),
    })
    .eq("id", claimed.id);

  return result.sent;
}

/** Shared footer + plain-text tail with settings and unsubscribe links. */
export function mailLinks(unsubscribeToken: string, itemPath: string) {
  const base = appBaseUrl();
  const settings = `${base}/app/profile`;
  const unsubscribe = `${base}/api/public/unsubscribe?token=${unsubscribeToken}`;
  const item = `${base}${itemPath}`;
  return {
    item,
    settings,
    unsubscribe,
    footerHtml: `<p style="font-size:14px;color:#6b6560"><a href="${settings}" style="color:#6b6560">Notification settings</a> &middot; <a href="${unsubscribe}" style="color:#6b6560">Unsubscribe</a></p>`,
    textTail: `
Open it: ${item}
Notification settings: ${settings}
Unsubscribe: ${unsubscribe}
`,
    buttonHtml: `<p><a href="${item}" style="display:inline-block;background:#2f6f6a;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none">Open CareCircle</a></p>`,
  };
}

export function cronAuthFailure(request: Request) {
  const secrets = [
    process.env["DIGEST_CRON_SECRET"],
    process.env["LOVABLE_CRON_SECRET"],
  ].filter(Boolean);
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secrets.length || !token || !secrets.includes(token)) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
}
