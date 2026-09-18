/** Server-only email helpers. Never import this from client code. */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "CareCircle <onboarding@resend.dev>";

export function appBaseUrl() {
  return (
    process.env["APP_BASE_URL"] ??
    "https://project--0edf9bf0-06c7-4534-a2b9-b934a7b22db2.lovable.app"
  );
}

function shell(bodyHtml: string, footerHtml = "") {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:#2b2b2b;max-width:520px;margin:0 auto;padding:24px">
${bodyHtml}
<hr style="border:none;border-top:1px solid #e6e1da;margin:28px 0" />
<p style="font-size:14px;color:#6b6560">CareCircle does not provide medical advice. In an emergency call 999.</p>
${footerHtml}
</div>`;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  bodyHtml: string;
  footerHtml?: string;
  /** Optional plain-text alternative. */
  text?: string;
}) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured; email not sent.");
    return { sent: false as const, reason: "not_configured" };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [options.to],
      subject: options.subject,
      html: shell(options.bodyHtml, options.footerHtml ?? ""),
      ...(options.text
        ? {
            text: `${options.text}

CareCircle does not provide medical advice. In an emergency call 999.`,
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Resend request failed [${response.status}]: ${errorBody}`);
    return { sent: false as const, reason: `provider_error_${response.status}` };
  }

  return { sent: true as const };
}

/** Map of auth user id -> email address. Requires the admin client. */
export async function listAuthEmails() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const emails = new Map<string, string>();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email) emails.set(user.id, user.email);
    }
    if (data.users.length < 200) break;
  }
  return emails;
}
