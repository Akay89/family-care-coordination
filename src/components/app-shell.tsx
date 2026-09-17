import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarHeart,
  CheckSquare,
  FileText,
  Home,
  ListChecks,
  LogOut,
  MessageCircle,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/checklists", label: "Checklists", icon: ListChecks },
  { to: "/app/updates", label: "Updates", icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const isActive = (to: string) =>
    to === "/app" ? pathname === "/app" : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="container-page flex items-center justify-between py-3">
          <Link to="/app" className="flex items-center gap-2.5">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <User className="size-5" aria-hidden="true" />
                <span>Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/app/profile" className="cursor-pointer text-base">
                  <User className="size-4" aria-hidden="true" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-base"
                onSelect={() => void handleSignOut()}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="container-page flex flex-1 gap-8 py-6">
        <nav
          aria-label="Main"
          className="hidden w-56 shrink-0 md:block"
        >
          <ul className="sticky top-24 space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition-colors",
                    isActive(item.to)
                      ? "bg-teal-soft text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden"
      >
        <ul className="grid grid-cols-6">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-xs font-medium",
                  isActive(item.to) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
