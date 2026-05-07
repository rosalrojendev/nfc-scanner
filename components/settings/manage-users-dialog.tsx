"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  addInspector,
  removeInspector,
  useSettings,
} from "@/lib/settings-store";
import { ROLE_META } from "@/lib/role-meta";
import { Plus, Trash2, HardHat } from "lucide-react";

interface ManageUsersDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ManageUsersDialog({ open, onClose }: ManageUsersDialogProps) {
  const settings = useSettings();
  const { notify } = useToast();
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const meta = ROLE_META.inspector;

  function add() {
    const name = draft.trim();
    if (name.length < 2) {
      setError("Enter a full name (2+ characters).");
      return;
    }
    if (settings.inspectors.includes(name)) {
      setError("That inspector is already on the roster.");
      return;
    }
    addInspector(name);
    setDraft("");
    setError(null);
    notify(`${name} added to the roster.`, "success");
  }

  function remove(name: string) {
    if (settings.inspectors.length <= 1) {
      notify("At least one inspector must remain on the roster.", "error");
      return;
    }
    if (!confirm(`Remove ${name} from the inspector roster?`)) return;
    removeInspector(name);
    notify(`${name} removed.`);
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Manage inspectors">
      <Eyebrow>Authorized inspectors</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">
        Manage roster
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Inspectors here can be selected when logging an inspection.
      </p>

      <div className="grid gap-2 max-h-[40vh] overflow-auto -mx-1 px-1">
        {settings.inspectors.map((name) => (
          <div
            key={name}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]"
          >
            <div
              className="w-9 h-9 shrink-0 rounded-full grid place-items-center"
              style={{
                background: meta.accentHighlight,
                color: meta.accent,
              }}
              aria-hidden
            >
              <HardHat size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <strong className="block truncate">{name}</strong>
              <span className="text-xs text-[var(--color-text-muted)]">
                Inspector
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(name)}
              aria-label={`Remove ${name}`}
              className="inline-flex w-8 h-8 items-center justify-center rounded-full text-[var(--color-error)] bg-[var(--color-error-highlight)] hover:opacity-90"
            >
              <Trash2 size={14} />
            </button>
          </div>
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
