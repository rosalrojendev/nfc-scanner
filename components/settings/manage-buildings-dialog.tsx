"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useProjectContext } from "@/components/shell/project-provider";
import {
  createBuilding,
  deleteBuilding,
  renameBuilding,
  useBuildings,
  type Building,
} from "@/lib/buildings-store";
import { Plus, Trash2, Save, Pencil, X, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManageBuildingsDialog({ open, onClose }: Props) {
  const { notify } = useToast();
  const { currentProject } = useProjectContext();
  const allBuildings = useBuildings();
  const buildings = React.useMemo(
    () =>
      currentProject
        ? allBuildings.filter((b) => b.projectId === currentProject.id)
        : [],
    [allBuildings, currentProject],
  );
  const [draft, setDraft] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setDraft("");
      setBusyId(null);
      setEditingId(null);
      setEditingName("");
    }
  }, [open]);

  async function add() {
    if (!currentProject) {
      notify("Pick a current project first.", "error");
      return;
    }
    if (draft.trim().length < 2) {
      notify("Building name must be at least 2 characters.", "error");
      return;
    }
    setBusyId("__add__");
    try {
      await createBuilding({
        projectId: currentProject.id,
        name: draft.trim(),
      });
      setDraft("");
      notify("Building added.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function save(b: Building) {
    if (editingName.trim().length < 2) return;
    setBusyId(b.id);
    try {
      await renameBuilding(b.id, editingName.trim());
      setEditingId(null);
      notify("Building renamed (cascaded to anchors and drawings).", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(b: Building) {
    if (
      !confirm(
        `Delete "${b.name}"? This won't delete anchors or drawings, just the building entity.`,
      )
    )
      return;
    setBusyId(b.id);
    try {
      await deleteBuilding(b.id);
      notify("Building deleted.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Manage buildings">
      <Eyebrow>Buildings</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">
        Manage buildings
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Buildings for{" "}
        <strong>{currentProject?.name ?? "current project"}</strong>. Renaming
        cascades to existing anchors and drawings in this project.
      </p>

      <div className="grid gap-2 max-h-[44vh] overflow-auto -mx-1 px-1">
        {buildings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No buildings in this project yet.
          </p>
        ) : (
          buildings.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]"
            >
              {editingId === b.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void save(b);
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => save(b)}
                    disabled={busyId === b.id}
                  >
                    {busyId === b.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                  >
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <strong className="flex-1 truncate">{b.name}</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(b.id);
                      setEditingName(b.name);
                    }}
                    aria-label={`Rename ${b.name}`}
                    className="inline-flex w-8 h-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    aria-label={`Delete ${b.name}`}
                    className="inline-flex w-8 h-8 items-center justify-center rounded-full text-[var(--color-error)] bg-[var(--color-error-highlight)] hover:opacity-90"
                    disabled={busyId === b.id}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="grid gap-2 pt-1 border-t border-[var(--color-border)]">
        <Eyebrow>Add building</Eyebrow>
        <Field>
          <Label htmlFor="add-building">Building name</Label>
          <div className="flex gap-2">
            <Input
              id="add-building"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Civic Plaza"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
            />
            <Button
              variant="primary"
              onClick={add}
              disabled={
                !currentProject ||
                busyId === "__add__" ||
                draft.trim().length < 2
              }
            >
              {busyId === "__add__" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Add
            </Button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Dialog>
  );
}
