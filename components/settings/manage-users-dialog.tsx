"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/input";
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
import { Plus, Trash2, Camera, Loader2, X } from "lucide-react";

interface ManageUsersDialogProps {
  open: boolean;
  onClose: () => void;
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
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function add() {
    const name = draft.trim();
    if (name.length < 2) {
      setError("Enter a full name (2+ characters).");
      return;
    }
    if (!currentClientId) {
      setError("Pick a current project to know which client to add to.");
      return;
    }
    if (rosterForClient.some((i) => i.name === name)) {
      setError("That inspector is already on this client's roster.");
      return;
    }
    try {
      await addInspector(currentClientId, name);
      setDraft("");
      setError(null);
      notify(`${name} added to the roster.`, "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to add.", "error");
    }
  }

  async function remove(insp: Inspector) {
    if (!confirm(`Remove ${insp.name} from the inspector roster?`)) return;
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
      notify(`${insp.name}'s avatar updated.`, "success");
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
        Inspectors here can be selected when logging an inspection. Tap the
        avatar to upload a photo.
      </p>

      <p className="text-xs text-[var(--color-text-muted)]">
        Roster for <strong>{currentClient?.name ?? "current client"}</strong>.
        Switch projects in the top-bar to manage another client&apos;s roster.
      </p>
      <div className="grid gap-2 max-h-[44vh] overflow-auto -mx-1 px-1">
        {rosterForClient.map((insp) => (
          <InspectorRow
            key={insp.id}
            inspector={insp}
            busy={busyId === insp.id}
            onUpload={(file) => handleAvatar(insp, file)}
            onClearAvatar={() => clearAvatar(insp)}
            onRemove={() => remove(insp)}
          />
        ))}
      </div>

      <div className="grid gap-2 pt-1 border-t border-[var(--color-border)]">
        <Eyebrow>Add inspector</Eyebrow>
        <Field>
          <Label htmlFor="add-inspector">Full name</Label>
          <Input
            id="add-inspector"
            placeholder="e.g. T. Quinn"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          {error ? (
            <p
              role="alert"
              className="text-xs"
              style={{ color: "var(--color-error)" }}
            >
              {error}
            </p>
          ) : null}
        </Field>
        <p className="text-xs text-[var(--color-text-muted)]">
          A photo can be added after the inspector is on the roster.
        </p>
        <div className="flex gap-2 justify-end">
          <Button onClick={onClose}>Done</Button>
          <Button variant="primary" onClick={add}>
            <Plus size={16} /> Add inspector
          </Button>
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
        aria-label={`Upload photo for ${inspector.name}`}
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
          {inspector.avatar ? "Photo on file" : "No photo"}
        </span>
      </div>
      {inspector.avatar ? (
        <button
          type="button"
          onClick={onClearAvatar}
          aria-label={`Clear photo for ${inspector.name}`}
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

