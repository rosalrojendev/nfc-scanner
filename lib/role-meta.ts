import {
  HardHat,
  ShieldCheck,
  Eye,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./types";

export interface RoleMeta {
  label: string;
  icon: LucideIcon;
  // CSS variable for the accent (driven by globals.css design tokens)
  accent: string;
  accentHighlight: string;
  description: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  inspector: {
    label: "Inspector",
    icon: HardHat,
    accent: "var(--color-primary)",
    accentHighlight: "var(--color-primary-highlight)",
    description: "Field crew · scans tags, logs proof tests, signs records.",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    accent: "var(--color-blue)",
    accentHighlight: "var(--color-blue-highlight)",
    description:
      "Oversight · manages users, reminders, and system-wide settings.",
  },
  client: {
    label: "Client",
    icon: Eye,
    accent: "var(--color-success)",
    accentHighlight: "var(--color-success-highlight)",
    description: "Read-only viewer · reviews certifications and reports.",
  },
};

export function roleMeta(role: Role): RoleMeta {
  return ROLE_META[role];
}
