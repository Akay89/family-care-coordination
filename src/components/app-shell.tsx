import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarHeart,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  History,
  Home,
  ListChecks,
  LogOut,
  MessageCircle,
  Plus,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallPrompt } from "@/components/install-prompt";
import { useCircles, roleLabels } from "@/hooks/use-circles";
import { useIsAdmin } from "@/hooks/use-checklists";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Home", icon: Home, testId: "nav-home" },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, testId: "nav-calendar" },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare, testId: "nav-tasks" },
  { to: "/app/documents", label: "Documents", icon: FileText, testId: "nav-documents" },
  { to: "/app/checklists", label: "Checklists", icon: ListChecks, testId: "nav-checklists" },
  { to: "/app/updates", label: "Updates", icon: MessageCircle, testId: "nav-updates" },
  { to: "/app/members", label: "People", icon: Users, testId: "nav-members" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { circles, activeCircle, selectCircle, isOrganiser } = useCircles();
  const isAdmin = useIsAdmin();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const isActive = (to: string) =>
    to === "/app" ? pathname === "/app" : pathname.startsWith(to);

  return (
    <div data-testid="app-shell" className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <Link to="/app" className="flex min-h-11 items-center gap-2.5">
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

            {activeCircle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button data-testid="circle-switcher" variant="outline" className="min-w-0 max-w-[15rem] gap-2">
                    <span className="truncate">{activeCircle.name}</span>
                    <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent data-testid="circle-switcher-list" align="start" className="w-64">
                  <DropdownMenuLabel>Your care circles</DropdownMenuLabel>
                  {circles.map((circle) => (
                    <DropdownMenuItem
                      key={circle.id}
                      className="cursor-pointer text-base"
                      onSelect={() => selectCircle(circle.id)}
                    >
                      {circle.id === activeCircle.id ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <span className="size-4" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {circle.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {roleLabels[circle.role]}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/app/welcome"
                      className="cursor-pointer text-base"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      New care circle
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="user-menu" variant="outline" className="gap-2">
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
              {isOrganiser && (
                <DropdownMenuItem asChild>
                  <Link to="/app/activity" className="cursor-pointer text-base">
                    <History className="size-4" aria-hidden="true" />
                    Circle activity
                  </Link>
                </DropdownMenuItem>
              )}
              {isAdmin.data && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="cursor-pointer text-base">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Checklist admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="logout"
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
        <nav aria-label="Main" className="hidden w-56 shrink-0 md:block">
          <ul className="sticky top-24 space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  data-testid={item.testId}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition-colors",
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

      <InstallPrompt />

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden"
      >
        <ul className="flex overflow-x-auto">
          {navItems.map((item) => (
            <li key={item.to} className="min-w-[4.5rem] flex-1">
              <Link
                to={item.to}
                data-testid={item.testId}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium",
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
