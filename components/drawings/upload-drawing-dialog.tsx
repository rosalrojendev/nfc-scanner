"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, FieldError, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { addDrawing } from "@/lib/drawings-store";
import { FileUp, Loader2, Image as ImageIcon } from "lucide-react";

interface UploadDrawingDialogProps {
  open: boolean;
  onClose: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function UploadDrawingDialog({
  open,
  onClose,
}: UploadDrawingDialogProps) {
  const { notify } = useToast();
  const [building, setBuilding] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function reset() {
    setBuilding("");
    setLevel("");
    setReference("");
    setFile(null);
    setErrors({});
  }

  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (building.trim().length < 2) next.building = "Building name is required.";
    if (level.trim().length < 1) next.level = "Level is required.";
    if (reference.trim().length < 1)
      next.reference = "Reference label is required (e.g. B-1).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      let url: string | undefined;
      let contentType: string | undefined;
      if (file) {
        if (file.size > MAX_BYTES) {
          notify("Plan file must be 5 MB or smaller.", "error");
          setSubmitting(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/photos", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Upload failed (${res.status})`);
        }
        const j = (await res.json()) as { url: string; contentType?: string };
        url = j.url;
        contentType = j.contentType ?? file.type;
      }
      addDrawing({
        building,
        level,
        reference,
        planUrl: url ?? null,
        planContentType: contentType,
      });
      notify("Drawing added to the library.", "success");
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not add drawing.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Upload drawing">
      <Eyebrow>Drawing library</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">Add a drawing</h3>
      <form className="grid gap-3" onSubmit={submit} noValidate>
        <Field>
          <Label htmlFor="dw-building">Building</Label>
          <Input
            id="dw-building"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="e.g. Civic Plaza"
          />
          <FieldError message={errors.building} />
        </Field>
        <Field>
          <Label htmlFor="dw-level">Level / zone</Label>
          <Input
            id="dw-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. Roof level B"
          />
          <FieldError message={errors.level} />
        </Field>
        <Field>
          <Label htmlFor="dw-ref">Reference label</Label>
          <Input
            id="dw-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. B-1"
          />
          <FieldError message={errors.reference} />
        </Field>
        <Field>
          <Label htmlFor="dw-file">Plan file (image or PDF, optional)</Label>
          <input
            id="dw-file"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {file ? (
            <span className="text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1">
              <ImageIcon size={14} /> {file.name} ·{" "}
              {(file.size / 1024).toFixed(0)} KB
            </span>
          ) : null}
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileUp size={16} />
            )}
            {submitting ? "Saving…" : "Add drawing"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
