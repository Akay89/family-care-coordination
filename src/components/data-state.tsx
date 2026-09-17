import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton placeholder for a list of cards while data loads. */
export function CardListSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={className ?? "mt-8 max-w-3xl space-y-3"}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border bg-card p-4"
          aria-hidden="true"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton placeholder for a few short lines of text. */
export function TextSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={className ?? "mt-4 space-y-2"} role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full max-w-md" aria-hidden="true" />
      ))}
    </div>
  );
}

/** Friendly, plain-English message shown when data can't be loaded. */
export function LoadError({
  what = "this",
  onRetry,
  className,
}: {
  what?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "mt-8 max-w-2xl rounded-2xl border border-border bg-card p-5"
      }
      role="alert"
    >
      <p className="text-lg font-medium">We couldn't load {what}.</p>
      <p className="mt-1 text-base text-muted-foreground">
        It's probably a wobbly connection rather than anything you did. Please try
        again.
      </p>
      {onRetry && (
        <Button className="mt-4 min-h-11" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
