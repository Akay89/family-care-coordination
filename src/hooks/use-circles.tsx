import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type CircleRole = "organiser" | "member" | "viewer";

export type Circle = {
  id: string;
  name: string;
  cared_for_name: string;
  cared_for_notes: string | null;
  created_by: string;
  role: CircleRole;
};

const STORAGE_KEY = "carecircle:last-circle";

type CirclesContextValue = {
  circles: Circle[];
  isLoading: boolean;
  isSelectionReady: boolean;
  activeCircle: Circle | null;
  hasInvalidSelection: boolean;
  selectCircle: (id: string) => void;
  refresh: () => Promise<void>;
  canEdit: boolean;
  isOrganiser: boolean;
};

const CirclesContext = createContext<CirclesContextValue | null>(null);

export function useCircles() {
  const ctx = useContext(CirclesContext);
  if (!ctx) throw new Error("useCircles must be used inside CirclesProvider");
  return ctx;
}

export function CirclesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSelectionReady, setIsSelectionReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedId(stored);
    setIsSelectionReady(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["circles"],
    queryFn: async (): Promise<Circle[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return [];
      const { data: rows, error } = await supabase
        .from("circle_members")
        .select(
          "role, joined_at, care_circles(id, name, cared_for_name, cared_for_notes, created_by)",
        )
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (rows ?? [])
        .filter((row) => row.care_circles)
        .map((row) => ({
          ...(row.care_circles as Omit<Circle, "role">),
          role: row.role as CircleRole,
        }));
    },
  });

  const circles = data ?? [];

  const hasInvalidSelection =
    !isLoading &&
    isSelectionReady &&
    selectedId !== null &&
    !circles.some((circle) => circle.id === selectedId);

  const activeCircle =
    (hasInvalidSelection
      ? null
      : circles.find((circle) => circle.id === selectedId)) ??
    (selectedId === null ? circles[0] : null) ??
    null;

  useEffect(() => {
    if (activeCircle) {
      window.localStorage.setItem(STORAGE_KEY, activeCircle.id);
    }
  }, [activeCircle]);

  const value = useMemo<CirclesContextValue>(
    () => ({
      circles,
      isLoading,
      isSelectionReady,
      activeCircle,
      hasInvalidSelection,
      selectCircle: (id: string) => {
        setSelectedId(id);
        window.localStorage.setItem(STORAGE_KEY, id);
      },
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: ["circles"] });
      },
      canEdit:
        activeCircle?.role === "organiser" || activeCircle?.role === "member",
      isOrganiser: activeCircle?.role === "organiser",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data,
      isLoading,
      isSelectionReady,
      activeCircle?.id,
      activeCircle?.role,
      hasInvalidSelection,
    ],
  );

  return (
    <CirclesContext.Provider value={value}>{children}</CirclesContext.Provider>
  );
}

export const roleLabels: Record<CircleRole, string> = {
  organiser: "Organiser",
  member: "Member",
  viewer: "Viewer",
};

export const roleDescriptions: Record<CircleRole, string> = {
  organiser: "Can manage people, invites and the circle itself.",
  member: "Can add and change plans, tasks and paperwork.",
  viewer: "Can see everything, but cannot make changes.",
};
