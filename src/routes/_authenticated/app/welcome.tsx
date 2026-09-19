import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HeartHandshake, Link2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCircles } from "@/hooks/use-circles";

export const Route = createFileRoute("/_authenticated/app/welcome")({
  component: WelcomePage,
});

function extractToken(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/invite\/([^/?#]+)/);
  return match?.[1] ?? trimmed;
}

function WelcomePage() {
  const navigate = useNavigate();
  const { refresh, selectCircle, circles } = useCircles();
  const [choice, setChoice] = useState<"create" | "invite">("create");
  const [name, setName] = useState("");
  const [caredForName, setCaredForName] = useState("");
  const [notes, setNotes] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Please sign in again.");
      // The id is generated here because the new row only becomes readable
      // once the creator's organiser membership exists.
      const id = crypto.randomUUID();
      const { error } = await supabase.from("care_circles").insert({
        id,
        name: name.trim(),
        cared_for_name: caredForName.trim(),
        cared_for_notes: notes.trim() === "" ? null : notes.trim(),
        created_by: user.id,
      });
      if (error) throw error;
      await refresh();
      selectCircle(id);
      toast.success("Your care circle is ready.");
      navigate({ to: "/app/members" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sorry, we couldn't create that circle.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const token = extractToken(inviteLink);
      if (!token) throw new Error("Please paste your invite link.");
      navigate({ to: "/invite/$token", params: { token } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That link didn't work.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-2xl">
      <h1 data-testid="circle-title" className="text-3xl font-semibold sm:text-4xl">
        {circles.length === 0
          ? "Welcome to CareCircle"
          : "Start another care circle"}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        A care circle is a private space for the family and friends looking after
        one person. Start one, or join a circle someone has invited you to.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          data-testid="create-circle-button"
          variant={choice === "create" ? "default" : "outline"}
          onClick={() => setChoice("create")}
        >
          <HeartHandshake className="size-5" aria-hidden="true" />
          Create a care circle
        </Button>
        <Button
          variant={choice === "invite" ? "default" : "outline"}
          onClick={() => setChoice("invite")}
        >
          <Link2 className="size-5" aria-hidden="true" />
          I have an invite link
        </Button>
      </div>

      {choice === "create" ? (
        <form
          onSubmit={handleCreate}
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="circleName">Name of the circle</Label>
            <Input
              id="circleName"
              data-testid="circle-name"
              value={name}
              placeholder="Looking after Mum"
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caredForName">Who are you caring for?</Label>
            <Input
              id="caredForName"
              data-testid="cared-for-name"
              value={caredForName}
              placeholder="Margaret"
              required
              onChange={(e) => setCaredForName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">
              Anything helpful for everyone to know (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              rows={3}
              placeholder="Prefers morning visits."
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Practical notes only, please — CareCircle isn&apos;t for medical
              details.
            </p>
          </div>
          <Button data-testid="circle-submit" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create care circle"}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleJoin}
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="inviteLink">Paste your invite link</Label>
            <Input
              id="inviteLink"
              value={inviteLink}
              placeholder="https://…/invite/abc123"
              required
              onChange={(e) => setInviteLink(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Join the circle"}
          </Button>
        </form>
      )}
    </section>
  );
}
