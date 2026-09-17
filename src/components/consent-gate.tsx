import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardListSkeleton, LoadError } from "@/components/data-state";
import { Label } from "@/components/ui/label";

/**
 * Shows a one-off explanation of what is stored and who can see it. The person
 * cannot use the app until they accept; we keep the date they accepted.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const consent = useQuery({
    queryKey: ["consent"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { accepted: true as const };
      const { data, error } = await supabase
        .from("profiles")
        .select("consent_accepted_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return {
        accepted: Boolean(data?.consent_accepted_at),
        userId: user.id,
      };
    },
  });

  async function accept() {
    if (!consent.data || !("userId" in consent.data)) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ consent_accepted_at: new Date().toISOString() })
      .eq("id", consent.data.userId as string);
    setSaving(false);
    if (error) {
      toast.error("Sorry, we couldn't save that. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["consent"] });
  }

  if (consent.isError) {
    return (
      <div className="container-narrow py-16">
        <LoadError
          what="your account details"
          onRetry={() => void consent.refetch()}
        />
      </div>
    );
  }

  if (consent.isLoading) {
    return (
      <div className="container-narrow py-16">
        <CardListSkeleton rows={2} className="space-y-3" />
      </div>
    );
  }

  if (consent.data?.accepted) return <>{children}</>;

  return (
    <div className="container-narrow py-10">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <span
          className="flex size-11 items-center justify-center rounded-full bg-teal-soft text-primary"
          aria-hidden="true"
        >
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl">
          Before you start, here&apos;s how your information is kept
        </h1>

        <div className="mt-6 space-y-4 text-lg leading-relaxed">
          <p>
            <strong>What we store:</strong> your name, email and optional phone
            number, plus the dates, tasks, checklists, notes, messages and
            documents you and your circle add.
          </p>
          <p>
            <strong>Who can see it:</strong> only the people in the same care
            circle as you. Organisers of a circle can also see a record of who
            did what in it. Nobody outside your circle can see anything.
          </p>
          <p>
            <strong>Emails:</strong> we send invitations, notes when something is
            given to you, and an optional daily summary. They never include file
            names, family messages or personal notes. You can turn them off on
            your Profile page.
          </p>
          <p>
            <strong>You stay in control:</strong> you can download a copy of your
            information or delete your account at any time from your Profile
            page.
          </p>
          <p>
            <strong>Not a medical service:</strong> CareCircle handles admin
            only, never medical advice. In an emergency call 999.
          </p>
        </div>

        <div className="mt-8 flex items-start gap-3">
          <Checkbox
            id="consent"
            className="mt-0.5 size-6 shrink-0"
            checked={agreed}
            onCheckedChange={(value) => setAgreed(value === true)}
          />
          <Label htmlFor="consent" className="text-base leading-relaxed">
            I understand and agree to the{" "}
            <Link to="/privacy" className="underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="underline">
              Terms of Use
            </Link>
            .
          </Label>
        </div>

        <Button
          className="mt-6"
          disabled={!agreed || saving}
          onClick={() => void accept()}
        >
          {saving ? "Saving…" : "I agree — continue"}
        </Button>
      </div>
    </div>
  );
}
