import type { Role } from "./types";

// Role-based gates. These are coarse "what kind of action can this role
// perform". Tenant scoping is enforced separately via canAccessProject /
// canManageClient in lib/server-store.ts.
//
// admin     — platform admin (your team), full power across all tenants.
// client    — org admin within their assigned clients (membership-scoped).
// inspector — field worker: scan, log inspections, write tags.
export const can = {
  viewDashboard: (_role: Role) => true,
  viewAnchors: (_role: Role) => true,
  editAnchor: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  viewInspections: (_role: Role) => true,
  logInspection: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  editInspection: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  deleteInspection: (role: Role) => role === "admin" || role === "client",
  scan: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  writeNfc: (role: Role) =>
    role === "admin" || role === "inspector" || role === "client",
  viewDrawings: (_role: Role) => true,
  uploadDrawings: (role: Role) => role === "admin" || role === "client",
  viewReports: (_role: Role) => true,
  exportReports: (role: Role) => role === "admin" || role === "client",
  emailReports: (role: Role) => role === "admin" || role === "client",
  manageUsers: (role: Role) => role === "admin" || role === "client",
  resetStore: (role: Role) => role === "admin",
  viewSettings: (_role: Role) => true,
};

export type Capability = keyof typeof can;
