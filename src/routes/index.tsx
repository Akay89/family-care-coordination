import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  CalendarHeart,
  ClipboardCheck,
  ListChecks,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareCircle — Care coordination, without the admin headache" },
      {
        name: "description",
        content:
          "CareCircle helps families in the UK share the practical side of caring for a relative — a shared calendar, a task rota and guided checklists for benefits and paperwork. No medical advice.",
      },
      { property: "og:title", content: "CareCircle — Care coordination, without the admin headache" },
      {
        property: "og:description",
        content:
          "Share the calendar, split the tasks, work through the paperwork — together. Free to start.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <WhoItsFor />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="container-page flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="CareCircle home">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CalendarHeart className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            CareCircle
          </span>
        </Link>
        <Link
          to="/login"
          className="rounded-full px-4 py-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open the app
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-soft via-warm-soft/40 to-background"
        aria-hidden="true"
      />
      <div className="container-narrow relative py-16 text-center sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          For families across the UK
        </p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl md:text-[3.5rem]">
          Caring for someone is hard enough.{" "}
          <span className="text-primary">The admin shouldn&apos;t be.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          CareCircle brings your family together around one shared calendar, a
          fair rota of everyday tasks, and gentle step-by-step checklists for
          benefits and paperwork. No jargon, no spreadsheets on the fridge.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90"
          >
            Get started free
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="text-sm text-muted-foreground">
            Free for your whole family. No card needed.
          </p>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: CalendarHeart,
    title: "Shared family calendar",
    description:
      "Hospital trips, the chemist, Sunday lunch at Mum's — everyone sees the same plan, in one place. Nobody turns up twice, and nothing is forgotten.",
    tone: "bg-teal-soft text-primary",
  },
  {
    icon: ClipboardCheck,
    title: "Task rota",
    description:
      "Lifts, shopping, prescriptions, bills. Share the jobs out fairly and tick them off together, so the same two people aren't carrying it all.",
    tone: "bg-warm-soft text-accent",
  },
  {
    icon: ListChecks,
    title: "Guided checklists",
    description:
      "Plain-English, step-by-step checklists for things like Attendance Allowance, council tax support and lasting power of attorney — telling you what to gather and who to ask.",
    tone: "bg-teal-soft text-primary",
  },
] as const;

function Features() {
  return (
    <section className="section-pad bg-background" aria-labelledby="features-heading">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-semibold sm:text-4xl">
            Everything practical, in one calm place
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            CareCircle looks after the day-to-day admin, so you can spend your
            energy on the person, not the paperwork.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-xl ${feature.tone}`}
                aria-hidden="true"
              >
                <feature.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoItsFor() {
  return (
    <section className="section-pad bg-teal-soft/50" aria-labelledby="who-heading">
      <div className="container-narrow text-center">
        <h2 id="who-heading" className="text-3xl font-semibold sm:text-4xl">
          Who it&apos;s for
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          For anyone quietly holding things together for a relative who&apos;s
          unwell, getting frailer, or living with dementia — and for the
          brothers, sisters, cousins and good neighbours helping them. Whether
          you&apos;re around the corner or three hours away, CareCircle keeps
          everyone pulling in the same direction.
        </p>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          It&apos;s also for the person being cared for: their appointments,
          wishes and day-to-day plans stay visible to the people they trust —
          without anything clinical creeping in.
        </p>
        <p className="mt-8 inline-block rounded-full border border-border bg-card px-6 py-3 text-base">
          <span className="font-semibold">CareCircle is not a medical service.</span>{" "}
          <span className="text-muted-foreground">
            We handle the admin, never advice or treatment.
          </span>
        </p>
      </div>
    </section>
  );
}

function SiteFooter() {
  const footerLinks = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="container-page py-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <CalendarHeart className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">CareCircle</span>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-base font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-base text-muted-foreground">
            CareCircle does not provide medical advice. In an emergency call 999.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            © {new Date().getFullYear()} CareCircle. Made with care in the UK.
          </p>
        </div>
      </div>
    </footer>
  );
}
