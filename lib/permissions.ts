import type { Role } from "./types";

// Role-based gates. These are coarse "what kind of action can this role
// perform". Tenant scoping is enforced separately via canAccessProject /
// canManageClient in lib/server-store.ts.
//
// admin     — platform admin (your team), full power across all tenants.
// client    — company admin within their assigned clients. Manages the
//             roster, drawings, reports, and NFC scanning, but anchors +
//             inspections are read-only — those are the inspector's record
//             of work and shouldn't be edited by the client side.
// inspector — field worker: scan, log inspections, write tags.
export const can = {
  viewDashboard: (_role: Role) => true,
  viewAnchors: (_role: Role) => true,
  editAnchor: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  // Deleting anchors is field-action territory. Clients (read-only on
  // inspections) intentionally can't delete anchors either — they could
  // erase the inspection history attached to them.
  deleteAnchor: (role: Role) => role === "admin" || role === "inspector",
  viewInspections: (_role: Role) => true,
  logInspection: (role: Role) => role === "admin" || role === "inspector",
  editInspection: (role: Role) => role === "admin" || role === "inspector",
  deleteInspection: (role: Role) =>
    role === "admin" || role === "inspector",
  scan: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  writeNfc: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  viewDrawings: (_role: Role) => true,
  uploadDrawings: (role: Role) => role === "admin" || role === "client",
  // Clients can upload + download but not pin anchors on a drawing — pinning
  // is part of the inspection workflow, not the client's read-only review.
  pinDrawing: (role: Role) => role === "admin" || role === "inspector",
  downloadDrawing: (_role: Role) => true,
  viewReports: (_role: Role) => true,
  exportReports: (role: Role) => role === "admin" || role === "client",
  emailReports: (role: Role) => role === "admin" || role === "client",
  manageUsers: (role: Role) => role === "admin" || role === "client",
  resetStore: (role: Role) => role === "admin",
  viewSettings: (_role: Role) => true,
  // Tenancy admin (clients + projects + memberships) is platform-admin only.
  // Client-side org admins manage their own roster via Settings → Manage users.
  viewTenancy: (role: Role) => role === "admin",
};

export type Capability = keyof typeof can;
