"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { useProjectContext } from "./project-provider";

export function ProjectSwitcher() {
  const { clients, projects, currentProjectId, setCurrentProject } =
    useProjectContext();

  if (projects.length === 0) return null;

  const grouped = clients
    .map((c) => ({
      client: c,
      projects: projects.filter((p) => p.clientId === c.id),
    }))
    .filter((g) => g.projects.length > 0);

  const onlyOne = projects.length === 1;
  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (onlyOne) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
        aria-label={`Current project: ${currentProject?.name ?? ""}`}
      >
        <Building2 size={12} />
        <span className="truncate max-w-[12ch]">{currentProject?.name}</span>
      </span>
    );
  }

  return (
    <label className="relative inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)]">
      <Building2 size={12} aria-hidden />
      <span className="sr-only">Current project</span>
      <select
        value={currentProjectId ?? ""}
        onChange={(e) => {
          if (e.target.value) void setCurrentProject(e.target.value);
        }}
        className="appearance-none bg-transparent border-none outline-none pr-3 cursor-pointer text-[var(--color-text)] max-w-[14ch] truncate"
      >
        {grouped.length === 1 ? (
          grouped[0].projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))
        ) : (
          grouped.map((g) => (
            <optgroup key={g.client.id} label={g.client.name}>
              {g.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))
        )}
      </select>
    </label>
  );
}
