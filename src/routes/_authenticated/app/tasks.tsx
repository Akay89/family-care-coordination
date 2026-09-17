import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: () => (
    <PlaceholderPage
      title="Tasks"
      description="A simple rota so the practical jobs are shared fairly."
      icon={CheckSquare}
    />
  ),
});
