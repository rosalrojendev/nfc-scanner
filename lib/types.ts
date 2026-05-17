export type Role = "inspector" | "admin" | "client";

export type AnchorStatus = "pass" | "due" | "failed";

export interface Client {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  reference?: string;
}

export type MembershipRole = "admin" | "member";

export interface Membership {
  userId: string;
  clientId: string;
  role: MembershipRole;
}

export interface Anchor {
  id: string;
  projectId: string;
  label: string;
  building: string;
  location: string;
  drawing: string;
  status: AnchorStatus;
  lastTested: string | null;
  nextDue: string | null;
  inspector: string | null;
  proofResult: string | null;
  nfcTag?: string;
  qrCode?: string;
  position?: { x: number; y: number };
  // Marketing-promised "installation date" surfaced on the anchor detail page.
  createdAt?: string | null;
  // Soft-delete trio. Set when an admin/inspector removes the anchor; the
  // record stays in the database so the activity feed can show who removed it.
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedByName?: string | null;
}

export type InspectionResult = "pass" | "review" | "failed";

export interface Inspection {
  id: string;
  projectId: string;
  anchorId: string;
  inspector: string;
  testDate: string;
  nextDueDate: string;
  result: InspectionResult;
  proofLoad: string;
  drawingRef: string;
  notes: string;
  photos: string[];
  signature: string | null;
  createdAt: string;
  updatedAt?: string;
  submittedBy?: string | null;
  submittedByName?: string | null;
  submittedByRole?: Role | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedByName?: string | null;
}

export interface DrawingPin {
  id: string;
  x: number;
  y: number;
  status: AnchorStatus;
}

export type DrawingAttachmentKind = "plan" | "detail" | "pdf";

export interface DrawingAttachment {
  id: string;
  kind: DrawingAttachmentKind;
  label: string;
  url: string;
  contentType?: string;
  addedAt: string;
}

export interface Drawing {
  id: string;
  projectId?: string;
  building: string;
  level: string;
  reference: string;
  anchors: DrawingPin[];
  planUrl?: string | null;
  attachments?: DrawingAttachment[];
  createdAt?: string;
  custom?: boolean;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  building: string;
  status: "ready" | "draft" | "scheduled";
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
