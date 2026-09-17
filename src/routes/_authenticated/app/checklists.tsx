import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/app/checklists")({
  component: () => (
    <PlaceholderPage
      title="Checklists"
      description="Guided steps for benefits, paperwork and other UK admin."
      icon={ListChecks}
    />
  ),
});
