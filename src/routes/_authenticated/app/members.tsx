import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Mail, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { sendInviteEmail } from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCircles,
  roleDescriptions,
  roleLabels,
  type CircleRole,
} from "@/hooks/use-circles";

export const Route = createFileRoute("/_authenticated/app/members")({
  component: MembersPage,
});

const roles: CircleRole[] = ["organiser", "member", "viewer"];

function MembersPage() {
  const { activeCircle, isOrganiser, refresh } = useCircles();
  const queryClient = useQueryClient();
  const circleId = activeCircle?.id;

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CircleRole>("member");
  const [busy, setBusy] = useState(false);

  const members = useQuery({
    queryKey: ["circle-members", circleId],
    enabled: Boolean(circleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("circle_members")
        .select("id, user_id, role, joined_at")
        .eq("circle_id", circleId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          rows.map((row) => row.user_id),
        );
      const names = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
      );
      return rows.map((row) => ({
        ...row,
        full_name: names.get(row.user_id) ?? "",
      }));
    },
  });

  const invites = useQuery({
    queryKey: ["circle-invites", circleId],
    enabled: Boolean(circleId) && isOrganiser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("circle_invites")
        .select("id, email, role, token, expires_at, accepted_at")
        .eq("circle_id", circleId!)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function inviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast.success("Invite link copied.");
    } catch {
      toast.error("Couldn't copy — you can select and copy the link instead.");
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!circleId) return;
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Please sign in again.");
      const { data, error } = await supabase
        .from("circle_invites")
        .insert({
          circle_id: circleId,
          email: email.trim().toLowerCase(),
          role: inviteRole,
          invited_by: user.id,
        })
        .select("id, token")
        .single();
      if (error) throw error;
      setEmail("");
      await invites.refetch();
      await copyLink(data.token);
      try {
        const result = await sendInviteEmail({ data: { inviteId: data.id } });
        toast.success(
          result?.sent
            ? "Invite sent by email — the link is copied too."
            : "Invite created — share the link with them.",
        );
      } catch {
        toast.success("Invite created — share the link with them.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sorry, we couldn't create that invite.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(memberId: string, role: CircleRole) {
    const { error } = await supabase
      .from("circle_members")
      .update({ role })
      .eq("id", memberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await members.refetch();
    await refresh();
    toast.success("Role updated.");
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase
      .from("circle_members")
      .delete()
      .eq("id", memberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await members.refetch();
    await refresh();
    await queryClient.invalidateQueries({ queryKey: ["circles"] });
    toast.success("Person removed from this circle.");
  }

  async function cancelInvite(inviteId: string) {
    const { error } = await supabase
      .from("circle_invites")
      .delete()
      .eq("id", inviteId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await invites.refetch();
    toast.success("Invite cancelled.");
  }

  if (!activeCircle) {
    return (
      <section>
        <h1 className="text-3xl font-semibold sm:text-4xl">People</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Choose or create a care circle first.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-semibold sm:text-4xl">People</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Everyone helping with {activeCircle.cared_for_name || activeCircle.name}.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Users className="size-5 text-primary" aria-hidden="true" />
          In this circle
        </h2>

        {members.isLoading ? (
          <p className="mt-4 text-base text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(members.data ?? []).map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="text-base font-medium">
                    {member.full_name.trim() || "Family member"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {roleDescriptions[member.role as CircleRole]}
                  </p>
                </div>

                {isOrganiser ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        void changeRole(member.id, value as CircleRole)
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Remove from circle"
                      onClick={() => void removeMember(member.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-base text-muted-foreground">
                    {roleLabels[member.role as CircleRole]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isOrganiser && (
        <>
          <form
            onSubmit={handleInvite}
            className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6"
          >
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Mail className="size-5 text-primary" aria-hidden="true" />
              Invite someone
            </h2>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Their email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">What can they do?</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as CircleRole)}
              >
                <SelectTrigger id="inviteRole" className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {roleDescriptions[inviteRole]}
              </p>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating invite…" : "Create invite link"}
            </Button>
            <p className="text-sm text-muted-foreground">
              We&apos;ll copy a link for you to send them however you like. It
              works for 7 days.
            </p>
          </form>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Invites waiting</h2>
            {invites.isLoading ? (
              <p className="mt-4 text-base text-muted-foreground">Loading…</p>
            ) : (invites.data ?? []).length === 0 ? (
              <p className="mt-4 text-base text-muted-foreground">
                No invites waiting at the moment.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {(invites.data ?? []).map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium">
                        {invite.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {roleLabels[invite.role as CircleRole]} · expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void copyLink(invite.token)}
                      >
                        <Copy className="size-4" aria-hidden="true" />
                        Copy link
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Cancel invite"
                        onClick={() => void cancelInvite(invite.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
