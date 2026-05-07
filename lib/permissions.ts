import type { Role } from "./types";

export const can = {
  viewDashboard: (_role: Role) => true,
  viewAnchors: (_role: Role) => true,
  editAnchor: (role: Role) => role === "admin" || role === "inspector",
  viewInspections: (_role: Role) => true,
  logInspection: (role: Role) => role === "admin" || role === "inspector",
  editInspection: (role: Role) => role === "admin" || role === "inspector",
  deleteInspection: (role: Role) => role === "admin" || role === "inspector",
  scan: (role: Role) => role === "admin" || role === "inspector",
  writeNfc: (role: Role) => role === "admin" || role === "inspector",
  viewDrawings: (_role: Role) => true,
  uploadDrawings: (role: Role) => role === "admin",
  viewReports: (_role: Role) => true,
  exportReports: (role: Role) => role === "admin" || role === "client",
  emailReports: (role: Role) => role === "admin" || role === "client",
  manageUsers: (role: Role) => role === "admin",
  resetStore: (role: Role) => role === "admin",
  viewSettings: (_role: Role) => true,
};

export type Capability = keyof typeof can;
