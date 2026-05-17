"use client";

import * as React from "react";
import type { Client, Project } from "@/lib/types";
import { refetchAll as refetchAnchorsAndInspections } from "@/lib/store";
import { refetch as refetchBuildings } from "@/lib/buildings-store";
import { refetch as refetchDrawings } from "@/lib/drawings-store";

interface ProjectContextValue {
  clients: Client[];
  projects: Project[];
  currentProjectId: string | null;
  currentProject: Project | null;
  canManageAnyClient: boolean;
  setCurrentProject: (projectId: string) => Promise<void>;
}

const Ctx = React.createContext<ProjectContextValue | null>(null);

interface ProviderProps {
  clients: Client[];
  projects: Project[];
  initialCurrentProjectId: string | null;
  canManageAnyClient: boolean;
  children: React.ReactNode;
}

export function ProjectProvider({
  clients,
  projects,
  initialCurrentProjectId,
  canManageAnyClient,
  children,
}: ProviderProps) {
  const [currentProjectId, setCurrentProjectId] = React.useState<
    string | null
  >(initialCurrentProjectId);

  const setCurrentProject = React.useCallback(async (projectId: string) => {
    setCurrentProjectId(projectId);
    // Kick off refetches in parallel with the server-side preference write.
    // The store helpers wrap their fetches in withFetch(), so the GlobalLoader
    // surfaces while data is being refreshed — giving the user a clear "the
    // page is switching" affordance instead of a silent context swap.
    try {
      await Promise.all([
        fetch("/api/me/current-project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectId }),
        }),
        refetchAnchorsAndInspections(),
        refetchBuildings(),
        refetchDrawings(),
      ]);
    } catch {
      // optimistic — UI already updated to the new project
    }
  }, []);

  const currentProject = React.useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const value = React.useMemo<ProjectContextValue>(
    () => ({
      clients,
      projects,
      currentProjectId,
      currentProject,
      canManageAnyClient,
      setCurrentProject,
    }),
    [
      clients,
      projects,
      currentProjectId,
      currentProject,
      canManageAnyClient,
      setCurrentProject,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjectContext(): ProjectContextValue {
  const v = React.useContext(Ctx);
  if (!v) {
    throw new Error(
      "useProjectContext must be used inside ProjectProvider",
    );
  }
  return v;
}
