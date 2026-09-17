import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const VISITS_KEY = "carecircle:visits";
const DISMISSED_KEY = "carecircle:install-prompt-seen";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

/**
 * Invites people to add CareCircle to their home screen. Shown once only,
 * on mobile, from the second visit onwards.
 */
export function InstallPrompt() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    let visits = 0;
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) return;
      visits = Number(window.localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      window.localStorage.setItem(VISITS_KEY, String(visits));
    } catch {
      return;
    }
    if (visits < 2) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    setVisible(true);

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* nothing more we can do */
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    dismiss();
  }

  if (!visible || !isMobile) return null;

  return (
    <div
      role="dialog"
      aria-label="Add CareCircle to your home screen"
      className="fixed inset-x-3 bottom-20 z-30 rounded-2xl border border-border bg-card p-4 shadow-lg md:hidden"
    >
      <div className="flex items-start gap-3">
        <img
          src="/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="size-11 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">Keep CareCircle to hand</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {installEvent
              ? "Add it to your home screen to open it like an app."
              : "Tap the share button, then “Add to Home Screen”."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {installEvent ? (
              <Button className="min-h-11" onClick={() => void install()}>
                Add to home screen
              </Button>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
                <Share className="size-5" aria-hidden="true" />
                Share → Add to Home Screen
              </span>
            )}
            <Button variant="ghost" className="min-h-11" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Close this message"
          onClick={dismiss}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
