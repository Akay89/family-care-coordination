import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SoleOrganiserCircle = {
  circle_id: string;
  circle_name: string;
  other_members: number;
};

/**
 * Deletes the signed-in person's account. Refuses while they are the only
 * organiser of a circle that still has other people in it.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: sole, error: soleError } = await supabase.rpc(
      "my_sole_organiser_circles",
    );
    if (soleError) throw new Error(soleError.message);

    const blocking = ((sole ?? []) as SoleOrganiserCircle[]).filter(
      (row) => row.other_members > 0,
    );
    if (blocking.length > 0) {
      return { deleted: false as const, blocking };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Circles where this person is the only organiser and nobody else is left:
    // remove the circle and everything hanging off it.
    for (const row of (sole ?? []) as SoleOrganiserCircle[]) {
      const { data: files } = await supabaseAdmin.storage
        .from("circle-documents")
        .list(row.circle_id, { limit: 1000 });
      if (files && files.length > 0) {
        await supabaseAdmin.storage
          .from("circle-documents")
          .remove(files.map((file) => `${row.circle_id}/${file.name}`));
      }
      await supabaseAdmin
        .from("care_circles")
        .delete()
        .eq("id", row.circle_id);
    }

    await supabaseAdmin.from("circle_members").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("notification_preferences")
      .delete()
      .eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    return { deleted: true as const, blocking: [] as SoleOrganiserCircle[] };
  });
