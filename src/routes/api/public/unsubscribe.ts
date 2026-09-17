import { createFileRoute } from "@tanstack/react-router";

function page(message: string) {
  return new Response(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>CareCircle email settings</title></head>
<body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:17px;line-height:1.6;color:#2b2b2b;background:#faf7f2;margin:0;padding:48px 24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e1da;border-radius:16px;padding:28px">
<h1 style="font-size:24px;margin:0 0 12px">CareCircle</h1>
<p>${message}</p>
<p style="font-size:15px;color:#6b6560">You can change this any time on your Profile page.</p>
</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token");
        if (!token) return page("That link is missing its code.");

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin
          .from("notification_preferences")
          .update({ daily_digest: false })
          .eq("unsubscribe_token", token)
          .select("user_id")
          .maybeSingle();

        if (error) {
          console.error("Unsubscribe failed", error);
          return page("Sorry, something went wrong. Please try again later.");
        }
        if (!data) return page("That link is no longer valid.");
        return page("Done — you won't get the daily summary email any more.");
      },
    },
  },
});
