import "server-only";
import type {
  Anchor as AnchorDb,
  DrawingAttachment as DrawingAttachmentDb,
  DrawingPin as DrawingPinDb,
  Drawing as DrawingDb,
  Inspection as InspectionDb,
} from "@prisma/client";
import { prisma } from "./db";
import { resetDatabase } from "./db-seed";
import type {
  Anchor,
  Client,
  Drawing,
  DrawingAttachment,
  DrawingAttachmentKind,
  DrawingPin,
  Inspection,
  Membership,
  Project,
  SessionUser,
} from "./types";

// ---- serializers ---------------------------------------------------------
// Prisma returns Date objects; the app types use ISO strings to keep the
// API response shape stable for the client.

function dateOnly(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function toAnchor(a: AnchorDb): Anchor {
  return {
    id: a.id,
    projectId: a.projectId,
    label: a.label,
    building: a.building,
    location: a.location,
    drawing: a.drawing,
    status: a.status,
    lastTested: dateOnly(a.lastTested),
    nextDue: dateOnly(a.nextDue),
    inspector: a.inspector,
    proofResult: a.proofResult,
    nfcTag: a.nfcTag ?? undefined,
    qrCode: a.qrCode ?? undefined,
    position:
      a.positionX != null && a.positionY != null
        ? { x: a.positionX, y: a.positionY }
        : undefined,
  };
}

function toInspection(i: InspectionDb): Inspection {
  return {
    id: i.id,
    projectId: i.projectId,
    anchorId: i.anchorId,
    inspector: i.inspector,
    testDate: dateOnly(i.testDate) ?? "",
    nextDueDate: dateOnly(i.nextDueDate) ?? "",
    result: i.result,
    proofLoad: i.proofLoad,
    drawingRef: i.drawingRef,
    notes: i.notes,
    photos: i.photos,
    signature: i.signature,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    submittedBy: i.submittedBy,
    submittedByName: i.submittedByName,
    submittedByRole: i.submittedByRole,
  };
}

// ---- clients / projects / memberships -----------------------------------

export async function listClients(): Promise<Client[]> {
  const rows = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return rows.map((c) => ({ id: c.id, name: c.name }));
}

export async function getClient(id: string): Promise<Client | null> {
  const c = await prisma.client.findUnique({ where: { id } });
  return c ? { id: c.id, name: c.name } : null;
}

export async function upsertClient(
  client: Client,
): Promise<Client> {
  const c = await prisma.client.upsert({
    where: { id: client.id },
    update: { name: client.name },
    create: { id: client.id, name: client.name },
  });
  return { id: c.id, name: c.name };
}

export async function listProjects(): Promise<Project[]> {
  const rows = await prisma.project.findMany({ orderBy: { name: "asc" } });
  return rows.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    name: p.name,
    reference: p.reference ?? undefined,
  }));
}

export async function listProjectsForClient(
  clientId: string,
): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    name: p.name,
    reference: p.reference ?? undefined,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const p = await prisma.project.findUnique({ where: { id } });
  return p
    ? {
        id: p.id,
        clientId: p.clientId,
        name: p.name,
        reference: p.reference ?? undefined,
      }
    : null;
}

export async function upsertProject(project: Project): Promise<Project> {
  const p = await prisma.project.upsert({
    where: { id: project.id },
    update: {
      clientId: project.clientId,
      name: project.name,
      reference: project.reference ?? null,
    },
    create: {
      id: project.id,
      clientId: project.clientId,
      name: project.name,
      reference: project.reference ?? null,
    },
  });
  return {
    id: p.id,
    clientId: p.clientId,
    name: p.name,
    reference: p.reference ?? undefined,
  };
}

export async function listMembershipsForUser(
  userId: string,
): Promise<Membership[]> {
  const rows = await prisma.membership.findMany({ where: { userId } });
  return rows.map((m) => ({
    userId: m.userId,
    clientId: m.clientId,
    role: m.role,
  }));
}

export async function listMembershipsForClient(
  clientId: string,
): Promise<Membership[]> {
  const rows = await prisma.membership.findMany({ where: { clientId } });
  return rows.map((m) => ({
    userId: m.userId,
    clientId: m.clientId,
    role: m.role,
  }));
}

export async function upsertMembership(
  membership: Membership,
): Promise<Membership> {
  const m = await prisma.membership.upsert({
    where: {
      userId_clientId: {
        userId: membership.userId,
        clientId: membership.clientId,
      },
    },
    update: { role: membership.role },
    create: membership,
  });
  return { userId: m.userId, clientId: m.clientId, role: m.role };
}

export async function removeMembership(
  userId: string,
  clientId: string,
): Promise<boolean> {
  try {
    await prisma.membership.delete({
      where: { userId_clientId: { userId, clientId } },
    });
    return true;
  } catch {
    return false;
  }
}

// ---- access control ------------------------------------------------------

export async function isClientAdmin(
  session: SessionUser,
  clientId: string,
): Promise<boolean> {
  if (session.role === "admin") return true;
  const m = await prisma.membership.findUnique({
    where: { userId_clientId: { userId: session.id, clientId } },
  });
  return m?.role === "admin";
}

export async function canManageClient(
  session: SessionUser,
  clientId: string,
): Promise<boolean> {
  return isClientAdmin(session, clientId);
}

export async function listManageableClients(
  session: SessionUser,
): Promise<Client[]> {
  if (session.role === "admin") return listClients();
  const adminMemberships = await prisma.membership.findMany({
    where: { userId: session.id, role: "admin" },
    select: { clientId: true },
  });
  const ids = adminMemberships.map((m) => m.clientId);
  if (ids.length === 0) return [];
  const rows = await prisma.client.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
  });
  return rows.map((c) => ({ id: c.id, name: c.name }));
}

export async function getAccessibleProjectIds(
  session: SessionUser,
): Promise<Set<string>> {
  if (session.role === "admin") {
    const all = await prisma.project.findMany({ select: { id: true } });
    return new Set(all.map((p) => p.id));
  }
  const memberships = await prisma.membership.findMany({
    where: { userId: session.id },
    select: { clientId: true },
  });
  if (memberships.length === 0) return new Set();
  const projects = await prisma.project.findMany({
    where: { clientId: { in: memberships.map((m) => m.clientId) } },
    select: { id: true },
  });
  return new Set(projects.map((p) => p.id));
}

export async function canAccessProject(
  session: SessionUser,
  projectId: string,
): Promise<boolean> {
  if (session.role === "admin") return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true },
  });
  if (!project) return false;
  const m = await prisma.membership.findUnique({
    where: {
      userId_clientId: { userId: session.id, clientId: project.clientId },
    },
  });
  return !!m;
}

// ---- anchors -------------------------------------------------------------

export async function listAnchors(filter?: {
  projectIds?: Set<string>;
}): Promise<Anchor[]> {
  const where =
    filter?.projectIds && filter.projectIds.size > 0
      ? { projectId: { in: Array.from(filter.projectIds) } }
      : filter?.projectIds
        ? { projectId: { in: [] as string[] } }
        : undefined;
  const rows = await prisma.anchor.findMany({
    where,
    orderBy: { id: "asc" },
  });
  return rows.map(toAnchor);
}

export async function getAnchor(id: string): Promise<Anchor | null> {
  const a = await prisma.anchor.findUnique({ where: { id } });
  return a ? toAnchor(a) : null;
}

export async function createAnchor(input: {
  id: string;
  projectId: string;
  label: string;
  building: string;
  location: string;
  drawing: string;
}): Promise<Anchor> {
  const a = await prisma.anchor.create({
    data: {
      id: input.id,
      projectId: input.projectId,
      label: input.label,
      building: input.building,
      location: input.location,
      drawing: input.drawing,
      status: "due",
    },
  });
  return toAnchor(a);
}

export async function upsertAnchor(anchor: Anchor): Promise<Anchor> {
  const data = {
    projectId: anchor.projectId,
    label: anchor.label,
    building: anchor.building,
    location: anchor.location,
    drawing: anchor.drawing,
    status: anchor.status,
    lastTested: anchor.lastTested ? new Date(anchor.lastTested) : null,
    nextDue: anchor.nextDue ? new Date(anchor.nextDue) : null,
    inspector: anchor.inspector,
    proofResult: anchor.proofResult,
    nfcTag: anchor.nfcTag ?? null,
    qrCode: anchor.qrCode ?? null,
    positionX: anchor.position?.x ?? null,
    positionY: anchor.position?.y ?? null,
  };
  const a = await prisma.anchor.upsert({
    where: { id: anchor.id },
    update: data,
    create: { id: anchor.id, ...data },
  });
  return toAnchor(a);
}

// ---- inspections ---------------------------------------------------------

export async function listInspections(filter?: {
  anchorId?: string;
  projectIds?: Set<string>;
}): Promise<Inspection[]> {
  const where: { anchorId?: string; projectId?: { in: string[] } } = {};
  if (filter?.anchorId) where.anchorId = filter.anchorId;
  if (filter?.projectIds) {
    where.projectId = { in: Array.from(filter.projectIds) };
  }
  const rows = await prisma.inspection.findMany({
    where,
    orderBy: { testDate: "desc" },
  });
  return rows.map(toInspection);
}

export async function getInspection(id: string): Promise<Inspection | null> {
  const i = await prisma.inspection.findUnique({ where: { id } });
  return i ? toInspection(i) : null;
}

export async function saveInspection(
  inspection: Inspection,
): Promise<Inspection> {
  const data = {
    projectId: inspection.projectId,
    anchorId: inspection.anchorId,
    inspector: inspection.inspector,
    testDate: new Date(inspection.testDate),
    nextDueDate: new Date(inspection.nextDueDate),
    result: inspection.result,
    proofLoad: inspection.proofLoad,
    drawingRef: inspection.drawingRef,
    notes: inspection.notes,
    photos: inspection.photos,
    signature: inspection.signature,
    submittedBy: inspection.submittedBy ?? null,
    submittedByName: inspection.submittedByName ?? null,
    submittedByRole: inspection.submittedByRole ?? null,
  };

  const saved = await prisma.$transaction(async (tx) => {
    const i = await tx.inspection.upsert({
      where: { id: inspection.id },
      update: data,
      create: { id: inspection.id, ...data },
    });

    // Cascade the latest inspection result onto the anchor.
    const status =
      i.result === "failed"
        ? "failed"
        : i.result === "review"
          ? "due"
          : "pass";
    await tx.anchor.update({
      where: { id: i.anchorId },
      data: {
        status,
        lastTested: i.testDate,
        nextDue: i.nextDueDate,
        inspector: i.inspector,
        proofResult: i.proofLoad,
      },
    });

    return i;
  });

  return toInspection(saved);
}

export async function deleteInspection(id: string): Promise<boolean> {
  try {
    await prisma.inspection.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ---- drawings ------------------------------------------------------------

type DrawingWithRelations = DrawingDb & {
  pins: DrawingPinDb[];
  attachments: DrawingAttachmentDb[];
};

function toDrawingPin(p: DrawingPinDb): DrawingPin {
  return { id: p.anchorId, x: p.x, y: p.y, status: p.status };
}

function toDrawingAttachment(a: DrawingAttachmentDb): DrawingAttachment {
  return {
    id: a.id,
    kind: a.kind,
    label: a.label,
    url: a.url,
    contentType: a.contentType ?? undefined,
    addedAt: a.addedAt.toISOString(),
  };
}

function toDrawing(d: DrawingWithRelations): Drawing {
  return {
    id: d.id,
    projectId: d.projectId ?? undefined,
    building: d.building,
    level: d.level,
    reference: d.reference,
    anchors: d.pins.map(toDrawingPin),
    attachments: d.attachments.map(toDrawingAttachment),
    planUrl: d.planUrl,
    createdAt: d.createdAt.toISOString(),
    custom: d.custom,
  };
}

export async function listDrawings(filter?: {
  projectIds?: Set<string>;
}): Promise<Drawing[]> {
  const where = filter?.projectIds
    ? { projectId: { in: Array.from(filter.projectIds) } }
    : undefined;
  const rows = await prisma.drawing.findMany({
    where,
    include: { pins: true, attachments: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDrawing);
}

export async function getDrawing(id: string): Promise<Drawing | null> {
  const d = await prisma.drawing.findUnique({
    where: { id },
    include: { pins: true, attachments: true },
  });
  return d ? toDrawing(d) : null;
}

export async function createDrawing(input: {
  projectId: string;
  building: string;
  level: string;
  reference: string;
  planUrl?: string | null;
  planContentType?: string;
  custom?: boolean;
}): Promise<Drawing> {
  const d = await prisma.drawing.create({
    data: {
      projectId: input.projectId,
      building: input.building,
      level: input.level,
      reference: input.reference,
      planUrl: input.planUrl ?? null,
      custom: input.custom ?? true,
      attachments: input.planUrl
        ? {
            create: [
              {
                kind: "plan",
                label: "Plan",
                url: input.planUrl,
                contentType: input.planContentType ?? null,
              },
            ],
          }
        : undefined,
    },
    include: { pins: true, attachments: true },
  });
  return toDrawing(d);
}

export async function deleteDrawing(id: string): Promise<boolean> {
  try {
    await prisma.drawing.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function addDrawingAttachment(
  drawingId: string,
  input: {
    kind: DrawingAttachmentKind;
    label: string;
    url: string;
    contentType?: string;
  },
): Promise<DrawingAttachment> {
  const a = await prisma.drawingAttachment.create({
    data: {
      drawingId,
      kind: input.kind,
      label: input.label,
      url: input.url,
      contentType: input.contentType ?? null,
    },
  });
  return toDrawingAttachment(a);
}

export async function removeDrawingAttachment(
  attachmentId: string,
): Promise<boolean> {
  try {
    await prisma.drawingAttachment.delete({ where: { id: attachmentId } });
    return true;
  } catch {
    return false;
  }
}

export async function upsertDrawingPin(
  drawingId: string,
  pin: { anchorId: string; x: number; y: number; status: Anchor["status"] },
): Promise<DrawingPin> {
  const p = await prisma.drawingPin.upsert({
    where: {
      drawingId_anchorId: { drawingId, anchorId: pin.anchorId },
    },
    update: { x: pin.x, y: pin.y, status: pin.status },
    create: { drawingId, ...pin },
  });
  return toDrawingPin(p);
}

export async function removeDrawingPin(
  drawingId: string,
  anchorId: string,
): Promise<boolean> {
  try {
    await prisma.drawingPin.delete({
      where: { drawingId_anchorId: { drawingId, anchorId } },
    });
    return true;
  } catch {
    return false;
  }
}

// ---- inspectors ----------------------------------------------------------

export interface InspectorRecord {
  id: string;
  clientId: string;
  name: string;
  avatarUrl: string | null;
}

export async function listInspectors(
  clientIds: string[],
): Promise<InspectorRecord[]> {
  if (clientIds.length === 0) return [];
  const rows = await prisma.inspector.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { name: "asc" },
  });
  return rows.map((i) => ({
    id: i.id,
    clientId: i.clientId,
    name: i.name,
    avatarUrl: i.avatarUrl,
  }));
}

export async function createInspector(input: {
  clientId: string;
  name: string;
  avatarUrl?: string | null;
}): Promise<InspectorRecord> {
  const i = await prisma.inspector.create({
    data: {
      clientId: input.clientId,
      name: input.name.trim(),
      avatarUrl: input.avatarUrl ?? null,
    },
  });
  return {
    id: i.id,
    clientId: i.clientId,
    name: i.name,
    avatarUrl: i.avatarUrl,
  };
}

export async function updateInspector(
  id: string,
  patch: { name?: string; avatarUrl?: string | null },
): Promise<InspectorRecord> {
  const i = await prisma.inspector.update({
    where: { id },
    data: {
      name: patch.name?.trim(),
      avatarUrl: patch.avatarUrl,
    },
  });
  return {
    id: i.id,
    clientId: i.clientId,
    name: i.name,
    avatarUrl: i.avatarUrl,
  };
}

export async function deleteInspector(id: string): Promise<boolean> {
  try {
    await prisma.inspector.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getInspector(
  id: string,
): Promise<InspectorRecord | null> {
  const i = await prisma.inspector.findUnique({ where: { id } });
  return i
    ? {
        id: i.id,
        clientId: i.clientId,
        name: i.name,
        avatarUrl: i.avatarUrl,
      }
    : null;
}

// ---- share links ---------------------------------------------------------

export interface ShareLinkRecord {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
}

export async function listShareLinks(
  projectIds: string[],
): Promise<ShareLinkRecord[]> {
  if (projectIds.length === 0) return [];
  const rows = await prisma.shareLink.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((l) => ({
    id: l.id,
    projectId: l.projectId,
    label: l.label,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function createShareLink(input: {
  projectId: string;
  label: string;
}): Promise<ShareLinkRecord> {
  const l = await prisma.shareLink.create({
    data: { projectId: input.projectId, label: input.label.trim() },
  });
  return {
    id: l.id,
    projectId: l.projectId,
    label: l.label,
    createdAt: l.createdAt.toISOString(),
  };
}

export async function deleteShareLink(id: string): Promise<boolean> {
  try {
    await prisma.shareLink.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getShareLink(
  id: string,
): Promise<ShareLinkRecord | null> {
  const l = await prisma.shareLink.findUnique({ where: { id } });
  return l
    ? {
        id: l.id,
        projectId: l.projectId,
        label: l.label,
        createdAt: l.createdAt.toISOString(),
      }
    : null;
}

// ---- user prefs (avatar + reminders) -------------------------------------

export interface UserPrefs {
  avatarUrl: string | null;
  reminderSixtyDay: boolean;
  reminderThirtyDay: boolean;
  reminderSevenDay: boolean;
}

export async function getUserPrefs(userId: string): Promise<UserPrefs | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      reminderSixtyDay: true,
      reminderThirtyDay: true,
      reminderSevenDay: true,
    },
  });
  return u ?? null;
}

export async function updateUserPrefs(
  userId: string,
  patch: Partial<UserPrefs>,
): Promise<UserPrefs | null> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: patch,
    select: {
      avatarUrl: true,
      reminderSixtyDay: true,
      reminderThirtyDay: true,
      reminderSevenDay: true,
    },
  });
  return u;
}

// ---- admin ---------------------------------------------------------------

export async function resetStore(): Promise<void> {
  await resetDatabase(prisma);
}
