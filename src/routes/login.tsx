import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarHeart, Mail } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safePath(value: unknown) {
  return typeof value === "string" && /^\/[^/\\]/.test(value) ? value : undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safePath(search['redirect']),
  }),
  head: () => ({
    meta: [
      { title: "Sign in to CareCircle" },
      {
        name: "description",
        content:
          "Sign in or create a free CareCircle account to share the practical admin of caring for a relative.",
      },
      { property: "og:title", content: "Sign in to CareCircle" },
      {
        property: "og:description",
        content: "Sign in or create a free CareCircle account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "magic";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/app", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate({ to: "/app", replace: true });
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/app", replace: true });
          return;
        }
        setSentTo(email);
        toast.success("Check your email to confirm your account.");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      setSentTo(email);
      toast.success("We've emailed you a sign-in link.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="container-page flex items-center py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <CalendarHeart className="size-5" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              CareCircle
            </span>
          </Link>
        </div>
      </header>

      <main className="container-narrow flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {sentTo ? (
            <div className="text-center">
              <span
                className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-soft text-primary"
                aria-hidden="true"
              >
                <Mail className="size-7" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">Check your email</h1>
              <p className="mt-3 text-base text-muted-foreground">
                We&apos;ve sent a link to <strong>{sentTo}</strong>. Open it on
                this device to continue.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setSentTo(null)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                {mode === "signup"
                  ? "It's free to start, and you can invite family later."
                  : "Sign in to your family's CareCircle."}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
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
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {mode !== "magic" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      minLength={8}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      required
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "signup"
                      ? "Get started free"
                      : mode === "magic"
                        ? "Email me a sign-in link"
                        : "Sign in"}
                </Button>
              </form>

              <div className="mt-6 space-y-3 text-base">
                {mode !== "magic" ? (
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() => setMode("magic")}
                  >
                    Sign in with an email link instead
                  </button>
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() => setMode("signin")}
                  >
                    Use a password instead
                  </button>
                )}
                <p className="text-muted-foreground">
                  {mode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                        onClick={() => setMode("signin")}
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New to CareCircle?{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                        onClick={() => setMode("signup")}
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="container-page py-6">
          <p className="text-base text-muted-foreground">
            CareCircle does not provide medical advice. In an emergency call 999.
          </p>
        </div>
      </footer>
    </div>
  );
}
