import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/app/documents")({
  component: () => (
    <PlaceholderPage
      title="Documents"
      description="Keep letters, forms and useful paperwork in one place the family can find."
      icon={FileText}
    />
  ),
});
