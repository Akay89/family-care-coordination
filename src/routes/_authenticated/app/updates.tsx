import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/app/updates")({
  component: () => (
    <PlaceholderPage
      title="Updates"
      description="Short notes to keep everyone in the loop, without endless group chats."
      icon={MessageCircle}
    />
  ),
});
