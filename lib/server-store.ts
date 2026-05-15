import "server-only";
import type {
  Anchor,
  Client,
  Inspection,
  Membership,
  Project,
  SessionUser,
} from "./types";
import {
  SEED_ANCHORS,
  SEED_CLIENTS,
  SEED_INSPECTIONS,
  SEED_MEMBERSHIPS,
  SEED_PROJECTS,
} from "./seed";

interface StoreState {
  anchors: Map<string, Anchor>;
  inspections: Map<string, Inspection>;
  clients: Map<string, Client>;
  projects: Map<string, Project>;
  memberships: Membership[];
}

declare global {
  var __atpServerStore: StoreState | undefined;
}

function freshState(): StoreState {
  const anchors = new Map<string, Anchor>();
  for (const a of SEED_ANCHORS) anchors.set(a.id, structuredClone(a));
  const inspections = new Map<string, Inspection>();
  for (const i of SEED_INSPECTIONS)
    inspections.set(i.id, structuredClone(i));
  const clients = new Map<string, Client>();
  for (const c of SEED_CLIENTS) clients.set(c.id, structuredClone(c));
  const projects = new Map<string, Project>();
  for (const p of SEED_PROJECTS) projects.set(p.id, structuredClone(p));
  const memberships = SEED_MEMBERSHIPS.map((m) => ({ ...m }));
  return { anchors, inspections, clients, projects, memberships };
}

const state: StoreState = globalThis.__atpServerStore ?? freshState();
globalThis.__atpServerStore = state;

export function listClients(): Client[] {
  return Array.from(state.clients.values());
}

export function getClient(id: string): Client | null {
  return state.clients.get(id) ?? null;
}

export function upsertClient(client: Client): Client {
  state.clients.set(client.id, client);
  return client;
}

export function listProjects(): Project[] {
  return Array.from(state.projects.values());
}

export function listProjectsForClient(clientId: string): Project[] {
  return Array.from(state.projects.values()).filter(
    (p) => p.clientId === clientId,
  );
}

export function getProject(id: string): Project | null {
  return state.projects.get(id) ?? null;
}

export function upsertProject(project: Project): Project {
  state.projects.set(project.id, project);
  return project;
}

export function listMembershipsForUser(userId: string): Membership[] {
  return state.memberships.filter((m) => m.userId === userId);
}

export function listMembershipsForClient(clientId: string): Membership[] {
  return state.memberships.filter((m) => m.clientId === clientId);
}

export function upsertMembership(membership: Membership): Membership {
  const idx = state.memberships.findIndex(
    (m) =>
      m.userId === membership.userId && m.clientId === membership.clientId,
  );
  if (idx >= 0) state.memberships[idx] = membership;
  else state.memberships.push(membership);
  return membership;
}

export function removeMembership(userId: string, clientId: string): boolean {
  const before = state.memberships.length;
  state.memberships = state.memberships.filter(
    (m) => !(m.userId === userId && m.clientId === clientId),
  );
  return state.memberships.length < before;
}

export function isClientAdmin(
  session: SessionUser,
  clientId: string,
): boolean {
  if (session.role === "admin") return true;
  return state.memberships.some(
    (m) =>
      m.userId === session.id &&
      m.clientId === clientId &&
      m.role === "admin",
  );
}

export function canManageClient(
  session: SessionUser,
  clientId: string,
): boolean {
  return isClientAdmin(session, clientId);
}

export function listManageableClients(session: SessionUser): Client[] {
  if (session.role === "admin") return listClients();
  const adminClientIds = new Set(
    state.memberships
      .filter((m) => m.userId === session.id && m.role === "admin")
      .map((m) => m.clientId),
  );
  return listClients().filter((c) => adminClientIds.has(c.id));
}

export function getAccessibleProjectIds(session: SessionUser): Set<string> {
  if (session.role === "admin") {
    return new Set(state.projects.keys());
  }
  const clientIds = new Set(
    listMembershipsForUser(session.id).map((m) => m.clientId),
  );
  const projectIds = new Set<string>();
  for (const p of state.projects.values()) {
    if (clientIds.has(p.clientId)) projectIds.add(p.id);
  }
  return projectIds;
}

export function canAccessProject(
  session: SessionUser,
  projectId: string,
): boolean {
  if (session.role === "admin") return true;
  const project = state.projects.get(projectId);
  if (!project) return false;
  return listMembershipsForUser(session.id).some(
    (m) => m.clientId === project.clientId,
  );
}

export function listAnchors(filter?: { projectIds?: Set<string> }): Anchor[] {
  const all = Array.from(state.anchors.values());
  if (!filter?.projectIds) return all;
  return all.filter((a) => filter.projectIds!.has(a.projectId));
}

export function getAnchor(id: string): Anchor | null {
  return state.anchors.get(id) ?? null;
}

export function upsertAnchor(anchor: Anchor): Anchor {
  state.anchors.set(anchor.id, anchor);
  return anchor;
}

export function listInspections(filter?: {
  anchorId?: string;
  projectIds?: Set<string>;
}): Inspection[] {
  let all = Array.from(state.inspections.values());
  if (filter?.anchorId) {
    all = all.filter((i) => i.anchorId === filter.anchorId);
  }
  if (filter?.projectIds) {
    all = all.filter((i) => filter.projectIds!.has(i.projectId));
  }
  return all.sort(
    (a, b) =>
      new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
  );
}

export function getInspection(id: string): Inspection | null {
  return state.inspections.get(id) ?? null;
}

export function saveInspection(inspection: Inspection): Inspection {
  state.inspections.set(inspection.id, inspection);

  const anchor = state.anchors.get(inspection.anchorId);
  if (anchor) {
    const status =
      inspection.result === "failed"
        ? "failed"
        : inspection.result === "review"
          ? "due"
          : "pass";
    state.anchors.set(anchor.id, {
      ...anchor,
      status,
      lastTested: inspection.testDate,
      nextDue: inspection.nextDueDate,
      inspector: inspection.inspector,
      proofResult: inspection.proofLoad,
    });
  }

  return inspection;
}

export function deleteInspection(id: string): boolean {
  return state.inspections.delete(id);
}

export function resetStore(): void {
  const next = freshState();
  state.anchors = next.anchors;
  state.inspections = next.inspections;
  state.clients = next.clients;
  state.projects = next.projects;
  state.memberships = next.memberships;
}
