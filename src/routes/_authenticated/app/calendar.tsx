import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: () => (
    <PlaceholderPage
      title="Calendar"
      description="One shared view of appointments, visits and who is covering them."
      icon={CalendarDays}
    />
  ),
});
