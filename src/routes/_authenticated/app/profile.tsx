import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

type PrefKey = "invite_emails" | "assignment_emails" | "daily_digest";

const prefCopy: { key: PrefKey; title: string; blurb: string }[] = [
  {
    key: "invite_emails",
    title: "Invitations",
    blurb: "Email me when I'm invited to a care circle.",
  },
  {
    key: "assignment_emails",
    title: "Things given to me",
    blurb: "Email me when someone puts a task or a date down for me.",
  },
  {
    key: "daily_digest",
    title: "Daily summary",
    blurb: "A short email each morning about the day ahead.",
  },
];

function ProfilePage() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { email: user.email ?? "", id: user.id, profile };
    },
  });

  const prefs = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");
      const { data: row, error } = await supabase
        .from("notification_preferences")
        .select("invite_emails, assignment_emails, daily_digest")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (row) return row;
      const { data: created, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({ user_id: user.id })
        .select("invite_emails, assignment_emails, daily_digest")
        .single();
      if (insertError) throw insertError;
      return created;
    },
  });

  useEffect(() => {
    if (data?.profile) {
      setFullName(data.profile.full_name ?? "");
      setPhone(data.profile.phone ?? "");
    }
  }, [data]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: data.id,
        full_name: fullName,
        phone: phone.trim() === "" ? null : phone.trim(),
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePref(key: PrefKey, value: boolean) {
    if (!data) return;
    const { error } = await supabase
      .from("notification_preferences")
      .update(
        key === "invite_emails"
          ? { invite_emails: value }
          : key === "assignment_emails"
            ? { assignment_emails: value }
            : { daily_digest: value },
      )
      .eq("user_id", data.id);
    if (error) {
      toast.error("Sorry, we couldn't change that setting.");
      return;
    }
    await prefs.refetch();
    toast.success("Email settings saved.");
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-semibold sm:text-4xl">Profile</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Your details, so family members know who&apos;s who.
      </p>

      {isLoading ? (
        <p className="mt-8 text-base text-muted-foreground">Loading…</p>
      ) : (
        <form
          onSubmit={handleSave}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={data?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              autoComplete="name"
              required
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold">Notification settings</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Choose which emails you&apos;d like from us. We never include names of
          files, personal notes or family messages in emails.
        </p>

        {prefs.isLoading ? (
          <p className="mt-6 text-base text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-6 space-y-5">
            {prefCopy.map((item) => (
              <li key={item.key} className="flex items-start gap-4">
                <div className="flex-1">
                  <Label htmlFor={item.key} className="text-base">
                    {item.title}
                  </Label>
                  <p className="mt-1 text-base text-muted-foreground">
                    {item.blurb}
                  </p>
                </div>
                <Switch
                  id={item.key}
                  checked={Boolean(prefs.data?.[item.key])}
                  onCheckedChange={(value) => void togglePref(item.key, value)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
