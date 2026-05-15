"use client";

import * as React from "react";
import type { Client, Project } from "@/lib/types";

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
    try {
      await fetch("/api/me/current-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
    } catch {
      // optimistic — UI already updated
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
