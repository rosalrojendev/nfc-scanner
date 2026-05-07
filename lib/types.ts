export type Role = "inspector" | "admin" | "client";

export type AnchorStatus = "pass" | "due" | "failed";

export interface Anchor {
  id: string;
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
}

export type InspectionResult = "pass" | "review" | "failed";

export interface Inspection {
  id: string;
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
