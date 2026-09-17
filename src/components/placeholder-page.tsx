import type { LucideIcon } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <section>
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {description}
      </p>
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <span
          className="flex size-14 items-center justify-center rounded-2xl bg-teal-soft text-primary"
          aria-hidden="true"
        >
          <Icon className="size-7" />
        </span>
        <p className="mt-5 text-lg font-medium">Coming soon</p>
        <p className="mt-2 max-w-md text-base text-muted-foreground">
          We&apos;re building this part of CareCircle now. Nothing to do here
          just yet.
        </p>
      </div>
    </section>
  );
}
