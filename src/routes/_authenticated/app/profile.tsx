import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Download } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  deleteMyAccount,
  type SoleOrganiserCircle,
} from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { LoadError, TextSkeleton } from "@/components/data-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

type PrefKey =
  | "invite_emails"
  | "assignment_emails"
  | "daily_digest"
  | "event_reminder_24h"
  | "event_reminder_1h"
  | "task_due_reminder";

type HourKey = "digest_hour" | "quiet_hours_start" | "quiet_hours_end";

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
    key: "event_reminder_24h",
    title: "Day-before reminders",
    blurb: "Email me the day before something in the calendar.",
  },
  {
    key: "event_reminder_1h",
    title: "Hour-before reminders",
    blurb: "Email me about an hour before something starts.",
  },
  {
    key: "task_due_reminder",
    title: "Tasks due today",
    blurb: "A morning email about tasks due today.",
  },
  {
    key: "daily_digest",
    title: "Daily summary",
    blurb: "A short email each morning about the day ahead.",
  },
];

const hourCopy: { key: HourKey; label: string }[] = [
  { key: "digest_hour", label: "Send my daily summary at" },
  { key: "quiet_hours_start", label: "Quiet hours start at" },
  { key: "quiet_hours_end", label: "Quiet hours end at" },
];

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00${suffix}`;
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blocking, setBlocking] = useState<SoleOrganiserCircle[]>([]);

  async function handleExport() {
    setExporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Please sign in again.");

      const [
        profile,
        prefs,
        memberships,
        events,
        tasks,
        updates,
        comments,
        documents,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("notification_preferences")
          .select("invite_emails, assignment_emails, daily_digest, created_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("circle_members")
          .select("role, joined_at, care_circles(id, name, cared_for_name)")
          .eq("user_id", user.id),
        supabase.from("events").select("*").eq("created_by", user.id),
        supabase.from("tasks").select("*").eq("created_by", user.id),
        supabase.from("updates").select("*").eq("author_id", user.id),
        supabase.from("update_comments").select("*").eq("author_id", user.id),
        supabase
          .from("documents")
          .select("id, circle_id, file_name, category, description, created_at")
          .eq("uploaded_by", user.id),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        note: "A copy of your CareCircle information and the things you added.",
        account: { id: user.id, email: user.email },
        profile: profile.data,
        email_settings: prefs.data,
        care_circles: memberships.data ?? [],
        dates_you_added: events.data ?? [],
        tasks_you_added: tasks.data ?? [],
        updates_you_posted: updates.data ?? [],
        replies_you_posted: comments.data ?? [],
        documents_you_added: documents.data ?? [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `carecircle-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Your file has been downloaded.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sorry, we couldn't prepare your file.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const result = await deleteMyAccount();
      if (!result.deleted) {
        setBlocking(result.blocking);
        return;
      }
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sorry, we couldn't delete your account.",
      );
    } finally {
      setDeleting(false);
    }
  }

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

        {prefs.isError ? (
          <LoadError
            what="your email settings"
            onRetry={() => void prefs.refetch()}
            className="mt-6"
          />
        ) : prefs.isLoading ? (
          <TextSkeleton lines={3} className="mt-6" />
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

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold">Your information</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Download a copy of your details and everything you&apos;ve added, as a
          single file.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download className="size-4" aria-hidden="true" />
          {exporting ? "Preparing…" : "Download my data"}
        </Button>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-destructive/40 bg-card p-6">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
          Delete my account
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          This permanently deletes your account, your details and your place in
          every care circle. It cannot be undone. If you&apos;re the only
          organiser of a circle with other people in it, please make someone else
          an organiser, or delete that circle, first.
        </p>

        {blocking.length > 0 && (
          <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-base font-medium">
              We couldn&apos;t delete your account yet.
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              You&apos;re the only organiser of{" "}
              {blocking.map((row) => row.circle_name).join(", ")}. Please make
              someone else an organiser on the People page, or delete the circle,
              then try again.
            </p>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-5">
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account for good?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Your details and your place in every care circle will be
                permanently deleted, and you&apos;ll be signed out. This cannot be
                undone. You may want to download your data first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my account</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={() => void handleDeleteAccount()}
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
