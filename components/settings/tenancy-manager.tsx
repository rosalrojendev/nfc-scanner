"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Building2,
  FolderKanban,
  Users,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import type {
  Client,
  Membership,
  MembershipRole,
  Project,
  Role,
} from "@/lib/types";

interface UserLite {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface TenantData {
  isPlatformAdmin: boolean;
  clients: Client[];
  projects: Project[];
  memberships: Membership[];
  users: UserLite[];
}

export function TenancyManager() {
  const { notify } = useToast();
  const [data, setData] = React.useState<TenantData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/tenants", { credentials: "include" });
      if (r.ok) {
        setData((await r.json()) as TenantData);
      } else {
        const j = await r.json().catch(() => ({}));
        notify(j.error || "Failed to load tenants.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function createClient() {
    if (newClientName.trim().length < 2) {
      notify("Client name must be at least 2 characters.", "error");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/tenants/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newClientName.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      setNewClientName("");
      notify("Client created.", "success");
      await reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function createProject(
    clientId: string,
    name: string,
    reference: string,
  ) {
    setBusy(true);
    try {
      const r = await fetch("/api/tenants/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId, name, reference }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      notify("Project added.", "success");
      await reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function upsertMember(
    clientId: string,
    userId: string,
    role: MembershipRole,
  ) {
    setBusy(true);
    try {
      const r = await fetch("/api/tenants/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId, userId, role }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      notify("Member updated.", "success");
      await reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(clientId: string, userId: string) {
    if (!confirm("Remove this member from the client?")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/tenants/memberships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId, userId }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status})`);
      }
      notify("Member removed.");
      await reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="text-sm text-[var(--color-text-muted)]">
        {data?.isPlatformAdmin
          ? "Platform admin — you can create clients and manage every project."
          : "Client admin — you can add projects and members to clients you administer."}
      </p>

      {loading && !data ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-4">
          {data.isPlatformAdmin ? (
            <article className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] grid gap-2">
              <Eyebrow>Create client</Eyebrow>
              <Field>
                <Label htmlFor="new-client">New client name</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-client"
                    placeholder="e.g. Riverstone Properties"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    onClick={createClient}
                    disabled={busy}
                  >
                    <Plus size={16} /> Add
                  </Button>
                </div>
              </Field>
            </article>
          ) : null}

          {data.clients.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No clients to manage yet.
            </p>
          ) : (
            data.clients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                projects={data.projects.filter((p) => p.clientId === c.id)}
                memberships={data.memberships.filter(
                  (m) => m.clientId === c.id,
                )}
                users={data.users}
                canPickUsers={data.isPlatformAdmin}
                busy={busy}
                onAddProject={(name, reference) =>
                  createProject(c.id, name, reference)
                }
                onUpsertMember={(userId, role) =>
                  upsertMember(c.id, userId, role)
                }
                onRemoveMember={(userId) => removeMember(c.id, userId)}
              />
            ))
          )}
        </div>
      ) : null}
    </>
  );
}

function ClientCard({
  client,
  projects,
  memberships,
  users,
  canPickUsers,
  busy,
  onAddProject,
  onUpsertMember,
  onRemoveMember,
}: {
  client: Client;
  projects: Project[];
  memberships: Membership[];
  users: UserLite[];
  canPickUsers: boolean;
  busy: boolean;
  onAddProject: (name: string, reference: string) => void;
  onUpsertMember: (userId: string, role: MembershipRole) => void;
  onRemoveMember: (userId: string) => void;
}) {
  const [projName, setProjName] = React.useState("");
  const [projRef, setProjRef] = React.useState("");
  const [userPick, setUserPick] = React.useState("");
  const [rolePick, setRolePick] = React.useState<MembershipRole>("member");

  const eligibleUsers = React.useMemo(() => {
    const memberIds = new Set(memberships.map((m) => m.userId));
    return users.filter((u) => !memberIds.has(u.id));
  }, [users, memberships]);

  return (
    <article className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="inline-flex items-center gap-2">
          <Building2 size={16} /> {client.name}
        </strong>
        <Badge variant="default">{projects.length} projects</Badge>
      </div>

      <section className="grid gap-2">
        <Eyebrow>
          <FolderKanban size={12} className="inline mr-1" /> Projects
        </Eyebrow>
        {projects.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            No projects yet.
          </p>
        ) : (
          <ul className="grid gap-1">
            {projects.map((p) => (
              <li
                key={p.id}
                className="text-sm flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                <span className="truncate">{p.name}</span>
                {p.reference ? (
                  <span className="text-xs text-[var(--color-text-faint)] font-mono">
                    {p.reference}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
          <Input
            placeholder="Project name"
            value={projName}
            onChange={(e) => setProjName(e.target.value)}
            aria-label={`New project name for ${client.name}`}
          />
          <Input
            placeholder="Reference (optional)"
            value={projRef}
            onChange={(e) => setProjRef(e.target.value)}
            aria-label="Project reference"
          />
          <Button
            variant="primary"
            disabled={busy || projName.trim().length < 2}
            onClick={() => {
              onAddProject(projName.trim(), projRef.trim());
              setProjName("");
              setProjRef("");
            }}
          >
            <Plus size={14} /> Add
          </Button>
        </div>
      </section>

      <section className="grid gap-2">
        <Eyebrow>
          <Users size={12} className="inline mr-1" /> Members (
          {memberships.length})
        </Eyebrow>
        {memberships.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            No members assigned.
          </p>
        ) : (
          <ul className="grid gap-1">
            {memberships.map((m) => {
              const u = users.find((x) => x.id === m.userId);
              return (
                <li
                  key={m.userId}
                  className="text-sm flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  <span className="truncate">
                    {u ? `${u.name} · ${u.email}` : m.userId}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {m.role === "admin" ? (
                      <Badge variant="primary">
                        <ShieldCheck size={11} /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="default">Member</Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveMember(m.userId)}
                      aria-label="Remove member"
                      className="inline-flex w-7 h-7 items-center justify-center rounded-full text-[var(--color-error)] bg-[var(--color-error-highlight)] hover:opacity-90"
                      disabled={busy}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {canPickUsers ? (
          eligibleUsers.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              All known users are already assigned.
            </p>
          ) : (
            <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
              <Select
                value={userPick}
                onChange={(e) => setUserPick(e.target.value)}
                aria-label={`Pick a user to add to ${client.name}`}
              >
                <option value="">Pick a user…</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </Select>
              <Select
                value={rolePick}
                onChange={(e) =>
                  setRolePick(e.target.value as MembershipRole)
                }
                aria-label="Membership role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
              <Button
                variant="primary"
                disabled={busy || !userPick}
                onClick={() => {
                  if (!userPick) return;
                  onUpsertMember(userPick, rolePick);
                  setUserPick("");
                  setRolePick("member");
                }}
              >
                <Plus size={14} /> Add
              </Button>
            </div>
          )
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">
            Ask a platform admin to add new users to this client.
          </p>
        )}
      </section>
    </article>
  );
}
