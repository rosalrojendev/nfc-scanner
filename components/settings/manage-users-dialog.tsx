"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, Label, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import {
  addInspector,
  removeInspector,
  updateInspector,
  useSettings,
  type Inspector,
} from "@/lib/settings-store";
import { uploadAvatar } from "@/lib/avatar-upload";
import { useProjectContext } from "@/components/shell/project-provider";
import { Plus, Trash2, Camera, Loader2, X, UserPlus } from "lucide-react";

interface ManageUsersDialogProps {
  open: boolean;
  onClose: () => void;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

export function ManageUsersDialog({ open, onClose }: ManageUsersDialogProps) {
  const settings = useSettings();
  const { notify } = useToast();
  const { currentProject, clients } = useProjectContext();
  const currentClient = clients.find(
    (c) => c.id === currentProject?.clientId,
  );
  const currentClientId = currentClient?.id;
  const rosterForClient = currentClientId
    ? settings.inspectors.filter((i) => i.clientId === currentClientId)
    : settings.inspectors;
  const [available, setAvailable] = React.useState<AvailableUser[]>([]);
  const [loadingAvailable, setLoadingAvailable] = React.useState(false);
  const [pickedUserId, setPickedUserId] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const reloadAvailable = React.useCallback(async () => {
    if (!open || !currentClientId) return;
    setLoadingAvailable(true);
    try {
      const r = await fetch(
        `/api/inspectors/available?clientId=${encodeURIComponent(currentClientId)}`,
        { credentials: "include" },
      );
      if (r.ok) {
        const j = (await r.json()) as { users: AvailableUser[] };
        setAvailable(j.users);
      } else {
        setAvailable([]);
      }
    } finally {
      setLoadingAvailable(false);
    }
  }, [open, currentClientId]);

  React.useEffect(() => {
    void reloadAvailable();
  }, [reloadAvailable]);

  // Whenever the roster changes (after add/remove), refetch the candidate
  // list so picker entries appear/disappear correctly.
  React.useEffect(() => {
    void reloadAvailable();
  }, [rosterForClient.length, reloadAvailable]);

  async function add() {
    if (!currentClientId) {
      notify("Pick a current project first.", "error");
      return;
    }
    if (!pickedUserId) {
      notify("Pick an inspector account.", "error");
      return;
    }
    try {
      await addInspector(currentClientId, pickedUserId);
      setPickedUserId("");
      notify("Inspector added to the roster.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to add.", "error");
    }
  }

  async function remove(insp: Inspector) {
    if (
      !confirm(
        `Remove ${insp.name} from this client's roster? They'll lose access to the projects.`,
      )
    )
      return;
    try {
      await removeInspector(insp.id);
      notify(`${insp.name} removed.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to remove.", "error");
    }
  }

  async function handleAvatar(insp: Inspector, file: File | null) {
    if (!file) return;
    setBusyId(insp.id);
    try {
      const url = await uploadAvatar(file);
      await updateInspector(insp.id, { avatar: url });
      notify(`${insp.name}'s roster avatar updated.`, "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function clearAvatar(insp: Inspector) {
    try {
      await updateInspector(insp.id, { avatar: null });
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Manage inspectors">
      <Eyebrow>Authorized inspectors</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">Manage roster</h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Pick from inspector accounts to add them to this client&apos;s roster.
        Adding gives them access to the projects; removing revokes it.
      </p>

      <p className="text-xs text-[var(--color-text-muted)]">
        Roster for <strong>{currentClient?.name ?? "current client"}</strong>.
        Switch projects in the top-bar to manage another client&apos;s roster.
      </p>
      <div className="grid gap-2 max-h-[44vh] overflow-auto -mx-1 px-1">
        {rosterForClient.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No inspectors on this roster yet.
          </p>
        ) : (
          rosterForClient.map((insp) => (
            <InspectorRow
              key={insp.id}
              inspector={insp}
              busy={busyId === insp.id}
              onUpload={(file) => handleAvatar(insp, file)}
              onClearAvatar={() => clearAvatar(insp)}
              onRemove={() => remove(insp)}
            />
          ))
        )}
      </div>

      <div className="grid gap-2 pt-1 border-t border-[var(--color-border)]">
        <Eyebrow>Add inspector</Eyebrow>
        {loadingAvailable ? (
          <p className="text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" /> Loading inspector
            accounts…
          </p>
        ) : available.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] inline-flex items-center gap-1.5">
            <UserPlus size={14} /> No inspector accounts available. Ask them
            to sign up at <code>/signup</code> first.
          </p>
        ) : (
          <Field>
            <Label htmlFor="add-inspector">Pick an inspector</Label>
            <div className="flex gap-2">
              <Select
                id="add-inspector"
                value={pickedUserId}
                onChange={(e) => setPickedUserId(e.target.value)}
              >
                <option value="">Choose…</option>
                {available.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </Select>
              <Button
                variant="primary"
                onClick={add}
                disabled={!pickedUserId || !currentClientId}
              >
                <Plus size={16} /> Add
              </Button>
            </div>
          </Field>
        )}
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}

function InspectorRow({
  inspector,
  busy,
  onUpload,
  onClearAvatar,
  onRemove,
}: {
  inspector: Inspector;
  busy: boolean;
  onUpload: (file: File) => void;
  onClearAvatar: () => void;
  onRemove: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative shrink-0 group"
        aria-label={`Upload roster photo for ${inspector.name}`}
        disabled={busy}
      >
        <Avatar name={inspector.name} src={inspector.avatar} size={44} />
        <span
          className="
            absolute inset-0 grid place-items-center rounded-full
            bg-black/50 text-white
            opacity-0 group-hover:opacity-100 transition-opacity
          "
          aria-hidden
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Camera size={16} />
          )}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <div className="flex-1 min-w-0">
        <strong className="block truncate">{inspector.name}</strong>
        <span className="text-xs text-[var(--color-text-muted)]">
          {inspector.avatar ? "Roster photo on file" : "No roster photo"}
        </span>
      </div>
      {inspector.avatar ? (
        <button
          type="button"
          onClick={onClearAvatar}
          aria-label={`Clear roster photo for ${inspector.name}`}
          className="inline-flex w-8 h-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        >
          <X size={14} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${inspector.name}`}
        className="inline-flex w-8 h-8 items-center justify-center rounded-full text-[var(--color-error)] bg-[var(--color-error-highlight)] hover:opacity-90"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
