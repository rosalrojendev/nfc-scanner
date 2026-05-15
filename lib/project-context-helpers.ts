import "server-only";
import { cookies } from "next/headers";
import {
  getAccessibleProjectIds,
  listClients,
  listManageableClients,
  listProjects,
} from "./server-store";
import type { Client, Project, SessionUser } from "./types";

const CURRENT_PROJECT_COOKIE = "atp.current_project";

export interface ProjectContextData {
  clients: Client[];
  projects: Project[];
  currentProjectId: string | null;
  canManageAnyClient: boolean;
}

export async function getProjectContext(
  session: SessionUser,
): Promise<ProjectContextData> {
  const [accessibleProjectIds, allProjects, allClients, manageable, store] =
    await Promise.all([
      getAccessibleProjectIds(session),
      listProjects(),
      listClients(),
      listManageableClients(session),
      cookies(),
    ]);

  const projects = allProjects.filter((p) => accessibleProjectIds.has(p.id));
  const accessibleClientIds = new Set(projects.map((p) => p.clientId));
  const clients = allClients.filter((c) => accessibleClientIds.has(c.id));

  const cookieValue = store.get(CURRENT_PROJECT_COOKIE)?.value;
  let currentProjectId: string | null = null;
  if (cookieValue && accessibleProjectIds.has(cookieValue)) {
    currentProjectId = cookieValue;
  } else if (projects.length > 0) {
    currentProjectId = projects[0].id;
  }

  return {
    clients,
    projects,
    currentProjectId,
    canManageAnyClient: manageable.length > 0,
  };
}

export async function setCurrentProjectCookie(
  projectId: string,
): Promise<void> {
  const store = await cookies();
  store.set(CURRENT_PROJECT_COOKIE, projectId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
