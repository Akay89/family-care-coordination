import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type InvitePreview = {
  circle_id: string;
  circle_name: string;
  cared_for_name: string;
  invite_role: "organiser" | "member" | "viewer";
  valid: boolean;
};

/**
 * Looks up the circle behind an invite token. Runs on the server so the
 * database helper is not exposed to unauthenticated callers; the token itself
 * is the only thing that grants access and nothing sensitive is returned.
 */
export const previewInvite = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ token: z.string().min(10).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<InvitePreview | null> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: rows, error } = await supabaseAdmin.rpc(
      "circle_invite_preview",
      { _token: data.token },
    );
    if (error) {
      console.error("[invites] preview failed", error.message);
      return null;
    }

    const invite = rows?.[0];
    if (!invite) return null;

    return {
      circle_id: invite.circle_id,
      circle_name: invite.circle_name,
      cared_for_name: invite.cared_for_name,
      invite_role: invite.invite_role,
      valid: invite.valid,
    };
  });
