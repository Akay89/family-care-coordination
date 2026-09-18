import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Emails an invited person their join link. Organisers only (enforced by RLS). */
export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { inviteId: string }) => {
    if (!input?.inviteId) throw new Error("Missing invite");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { sendEmail, appBaseUrl, listAuthEmails } = await import(
      "@/lib/email.server"
    );

    const { data: invite, error } = await context.supabase
      .from("circle_invites")
      .select("email, token, circle_id")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (error) throw error;
    if (!invite) return { sent: false, reason: "not_found" };

    const { data: circle } = await context.supabase
      .from("care_circles")
      .select("name")
      .eq("id", invite.circle_id)
      .maybeSingle();
    const circleName = circle?.name ?? "a care circle";

    // Respect the preference if the invited address already has an account.
    const emails = await listAuthEmails();
    const existingId = [...emails.entries()].find(
      ([, address]) => address.toLowerCase() === invite.email.toLowerCase(),
    )?.[0];
    if (existingId) {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: prefs } = await supabaseAdmin
        .from("notification_preferences")
        .select("invite_emails")
        .eq("user_id", existingId)
        .maybeSingle();
      if (prefs && !prefs.invite_emails) {
        return { sent: false, reason: "opted_out" };
      }
    }

    const link = `${appBaseUrl()}/invite/${invite.token}`;
    const result = await sendEmail({
      to: invite.email,
      subject: `You've been invited to help with ${circleName}`,
      bodyHtml: `<p>Hello,</p>
<p>You've been invited to join <strong>${escapeHtml(circleName)}</strong> on CareCircle — a private space for a family to share the practical admin of looking after someone.</p>
<p><a href="${link}" style="display:inline-block;background:#2f6f6a;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none">Join the care circle</a></p>
<p style="font-size:15px;color:#6b6560">This link works for 7 days. If it wasn't meant for you, you can ignore this email.</p>`,
    });
    return result;
  });

/** Tells someone a task or event has been given to them by someone else. */
export const sendAssignmentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "task" | "event"; id: string }) => {
    if (input?.kind !== "task" && input?.kind !== "event") {
      throw new Error("Unknown item");
    }
    if (!input.id) throw new Error("Missing item");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { sendEmail, appBaseUrl } = await import("@/lib/email.server");

    const table = data.kind === "task" ? "tasks" : "events";
    const { data: item, error } = await context.supabase
      .from(table)
      .select("assigned_to, circle_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!item?.assigned_to) return { sent: false, reason: "unassigned" };
    if (item.assigned_to === context.userId) {
      return { sent: false, reason: "self" };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("assignment_emails")
      .eq("user_id", item.assigned_to)
      .maybeSingle();
    if (prefs && !prefs.assignment_emails) {
      return { sent: false, reason: "opted_out" };
    }

    const { data: circle } = await context.supabase
      .from("care_circles")
      .select("name")
      .eq("id", item.circle_id)
      .maybeSingle();
    const circleName = circle?.name ?? "a care circle";

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(
      item.assigned_to,
    );
    const to = user?.user?.email;
    if (!to) return { sent: false, reason: "no_email" };

    const where = data.kind === "task" ? "/app/tasks" : "/app/calendar";
    const noun = data.kind === "task" ? "task" : "date in the calendar";
    const result = await sendEmail({
      to,
      subject: `Something has been added to your list in ${circleName}`,
      bodyHtml: `<p>Hello,</p>
<p>Someone has put a ${noun} down for you in <strong>${escapeHtml(circleName)}</strong>.</p>
<p><a href="${appBaseUrl()}${where}" style="display:inline-block;background:#2f6f6a;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none">See what it is</a></p>`,
    });
    return result;
  });

/** Sends the signed-in person one sample reminder, so they can check it arrives. */
export const sendTestReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendEmail } = await import("@/lib/email.server");
    const { mailLinks } = await import("@/lib/reminders.server");
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );
    const to = user?.user?.email;
    if (!to) return { sent: false, reason: "no_email" };

    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("unsubscribe_token")
      .eq("user_id", context.userId)
      .maybeSingle();

    const links = mailLinks(prefs?.unsubscribe_token ?? "", "/app");
    const line =
      "This is a sample reminder. A real one looks like this: “Tomorrow at 2:00pm you have 1 appointment in your care circle.”";

    const result = await sendEmail({
      to,
      subject: "Your test reminder from CareCircle",
      bodyHtml: `<p>Hello,</p><p>${line}</p>${links.buttonHtml}`,
      footerHtml: links.footerHtml,
      text: `Hello,\n\n${line}\n${links.textTail}`,
    });

    await supabaseAdmin.from("notification_log").insert({
      user_id: context.userId,
      item_type: "test",
      item_id: crypto.randomUUID(),
      reminder_kind: "test",
      scheduled_for: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      status: result.sent ? "sent" : "failed",
      sent_at: result.sent ? new Date().toISOString() : null,
      error_text: result.sent ? null : (result.reason ?? "unknown"),
    });

    return result;
  });
