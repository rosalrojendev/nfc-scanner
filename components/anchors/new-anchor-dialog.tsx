"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, FieldError, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useProjectContext } from "@/components/shell/project-provider";
import { createAnchor, useAnchors } from "@/lib/store";
import { anchorCreateSchema } from "@/lib/validation";
import { Plus, Loader2 } from "lucide-react";

interface NewAnchorDialogProps {
  open: boolean;
  onClose: () => void;
}

function suggestNextId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => id.match(/^RA-(\d+)$/)?.[1])
    .filter((s): s is string => !!s)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
  return `RA-${String(next).padStart(3, "0")}`;
}

export function NewAnchorDialog({ open, onClose }: NewAnchorDialogProps) {
  const router = useRouter();
  const { notify } = useToast();
  const { currentProject } = useProjectContext();
  const allAnchors = useAnchors();

  const suggestedId = React.useMemo(() => {
    const idsInProject = currentProject
      ? allAnchors
          .filter((a) => a.projectId === currentProject.id)
          .map((a) => a.id)
      : allAnchors.map((a) => a.id);
    return suggestNextId(idsInProject);
  }, [allAnchors, currentProject]);

  const [id, setId] = React.useState(suggestedId);
  const [label, setLabel] = React.useState("");
  const [building, setBuilding] = React.useState(
    currentProject?.name ?? "",
  );
  const [location, setLocation] = React.useState("");
  const [drawing, setDrawing] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Reset the form whenever the dialog opens or the project changes.
  React.useEffect(() => {
    if (open) {
      setId(suggestedId);
      setLabel("");
      setBuilding(currentProject?.name ?? "");
      setLocation("");
      setDrawing("");
      setErrors({});
    }
  }, [open, suggestedId, currentProject?.name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentProject) {
      notify("Pick a current project first.", "error");
      return;
    }
    const payload = {
      id: id.trim(),
      projectId: currentProject.id,
      label: label.trim() || `${id.trim()} · ${building.trim()}`,
      building: building.trim(),
      location: location.trim(),
      drawing: drawing.trim(),
    };
    const parsed = anchorCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || "form";
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      return;
    }
    setSubmitting(true);
    try {
      const anchor = await createAnchor(parsed.data);
      notify(`Anchor ${anchor.id} created.`, "success");
      onClose();
      router.push(`/anchors/${encodeURIComponent(anchor.id)}`);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Failed to create anchor.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Create new anchor">
      <Eyebrow>New anchor</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">
        Register a new anchor tag
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Adds the anchor record. After saving, you&apos;ll land on the detail
        page where you can write the URL to the physical NFC tag.
      </p>

      {!currentProject ? (
        <p
          role="alert"
          className="text-sm"
          style={{ color: "var(--color-error)" }}
        >
          Pick a current project in the top-bar before creating anchors.
        </p>
      ) : null}

      <form className="grid gap-3" onSubmit={submit} noValidate>
        <Field>
          <Label htmlFor="na-id">Anchor ID</Label>
          <Input
            id="na-id"
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            placeholder="e.g. RA-006"
            autoCapitalize="characters"
          />
          <FieldError message={errors.id} />
          <p className="text-xs text-[var(--color-text-muted)]">
            Suggested: <code>{suggestedId}</code>. Letters, digits, and dashes
            only.
          </p>
        </Field>
        <Field>
          <Label htmlFor="na-label">Label</Label>
          <Input
            id="na-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`${id} · North parapet`}
          />
          <FieldError message={errors.label} />
        </Field>
        <Field>
          <Label htmlFor="na-building">Building</Label>
          <Input
            id="na-building"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="e.g. Kamloops Office Tower"
          />
          <FieldError message={errors.building} />
        </Field>
        <Field>
          <Label htmlFor="na-location">Location</Label>
          <Input
            id="na-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Roof level B · North edge"
          />
          <FieldError message={errors.location} />
        </Field>
        <Field>
          <Label htmlFor="na-drawing">Drawing reference</Label>
          <Input
            id="na-drawing"
            value={drawing}
            onChange={(e) => setDrawing(e.target.value)}
            placeholder="e.g. B-1 North parapet detail"
          />
          <FieldError message={errors.drawing} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || !currentProject}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {submitting ? "Creating…" : "Create anchor"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
