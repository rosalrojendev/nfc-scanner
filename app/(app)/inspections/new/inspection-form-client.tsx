"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { InspectorPicker } from "@/components/inspection/inspector-picker";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { SignaturePad } from "@/components/inspection/signature-pad";
import { PhotoUpload } from "@/components/inspection/photo-upload";
import {
  getInspection,
  createInspection,
  updateInspection,
  useAnchors,
} from "@/lib/store";
import { inspectionInputSchema } from "@/lib/validation";
import { timestampFilename } from "@/lib/utils";
import { useSettings } from "@/lib/settings-store";
import { useSession } from "@/components/shell/session-provider";
import { useProjectContext } from "@/components/shell/project-provider";
import type { Inspection, InspectionResult } from "@/lib/types";
import { Save, X, Loader2 } from "lucide-react";
import { uploadFiles } from "@/lib/uploadthing";

async function dataUrlToFile(
  dataUrl: string,
  filename?: string,
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const name = filename ?? timestampFilename("sig", "png");
  return new File([blob], name, { type: blob.type || "image/png" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nextYearISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function emptyDraft(anchorId = "", defaultInspector = ""): Inspection {
  return {
    id: "",
    projectId: "",
    anchorId,
    inspector: defaultInspector,
    testDate: todayISO(),
    nextDueDate: nextYearISO(),
    result: "pass" as InspectionResult,
    proofLoad: "22 kN proof-load passed",
    drawingRef: "",
    notes: "",
    photos: [],
    signature: null,
    createdAt: new Date().toISOString(),
  };
}

export function InspectionFormClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { notify } = useToast();
  const anchors = useAnchors();
  const settings = useSettings();
  const session = useSession();
  const { currentProject } = useProjectContext();
  const currentClientId = currentProject?.clientId ?? null;

  // The Inspector table is keyed by (clientId, userId), so an admin who can
  // see multiple clients gets the same person back once per client. Scope to
  // the active project's client and then dedupe by userId for safety.
  const inspectorRoster = React.useMemo(() => {
    const scoped = currentClientId
      ? settings.inspectors.filter((i) => i.clientId === currentClientId)
      : settings.inspectors;
    const seen = new Set<string>();
    return scoped.filter((i) => {
      if (seen.has(i.userId)) return false;
      seen.add(i.userId);
      return true;
    });
  }, [settings.inspectors, currentClientId]);

  const editingId = params.get("id");
  const presetAnchor = params.get("anchor") || "";

  // If the signed-in user is an inspector, the form prefills with their own
  // name — they're nearly always logging their own work. Other roles fall back
  // to the first roster entry (admin or client viewing a project).
  const defaultInspectorName = React.useCallback(
    (roster: { userId: string; name: string }[]) => {
      if (session.role === "inspector") {
        return (
          roster.find((i) => i.userId === session.id)?.name ?? session.name
        );
      }
      return roster[0]?.name ?? "";
    },
    [session.id, session.name, session.role],
  );

  const [draft, setDraft] = React.useState<Inspection>(() => {
    if (editingId) {
      const existing = getInspection(editingId);
      if (existing) return existing;
    }
    return emptyDraft(presetAnchor, defaultInspectorName(inspectorRoster));
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function update<K extends keyof Inspection>(key: K, value: Inspection[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = inspectionInputSchema.safeParse(draft);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || "form";
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      notify("Please fix the highlighted fields.", "error");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // If the signature is still a data URL (user drew but didn't hit Save),
      // upload it to UploadThing now so we don't persist base64 in the DB.
      let payload = parsed.data;
      if (payload.signature.startsWith("data:")) {
        try {
          const file = await dataUrlToFile(payload.signature);
          const [uploaded] = await uploadFiles("avatarOrSignature", {
            files: [file],
          });
          if (uploaded) {
            payload = { ...payload, signature: uploaded.ufsUrl };
            update("signature", uploaded.ufsUrl);
          }
        } catch {
          // Fall through with the data URL if upload fails.
        }
      }
      if (editingId) {
        await updateInspection(editingId, payload);
      } else {
        await createInspection(payload);
      }
      notify(
        editingId
          ? "Inspection updated. Anchor record refreshed."
          : "Inspection saved. Next retest date updated.",
        "success",
      );
      router.push(`/anchors/${encodeURIComponent(payload.anchorId)}`);
      router.refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const anchorExists = anchors.some(
    (a) => a.id.toLowerCase() === draft.anchorId.toLowerCase(),
  );

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Inspection workflow</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              {editingId ? "Update inspection record" : "Capture proof test"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Photos, signature, and deficiency notes. Saved locally to the
              device.
            </p>
          </div>
          <Badge variant="blue">Field form</Badge>
        </div>

        <form onSubmit={submit} className="grid gap-3" noValidate>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field>
              <Label htmlFor="f-anchor">Anchor ID</Label>
              <Input
                id="f-anchor"
                value={draft.anchorId}
                onChange={(e) => update("anchorId", e.target.value.toUpperCase())}
                autoCapitalize="characters"
                required
                list="anchor-options"
              />
              <datalist id="anchor-options">
                {anchors.map((a) => (
                  <option key={a.id} value={a.id} label={a.label} />
                ))}
              </datalist>
              {!anchorExists && draft.anchorId ? (
                <p className="text-xs text-[var(--color-warning)]">
                  Unknown anchor — a new record will not be created in this
                  prototype.
                </p>
              ) : null}
              <FieldError message={errors.anchorId} />
            </Field>
            <Field>
              <Label htmlFor="f-inspector">Inspector</Label>
              <InspectorPicker
                buttonId="f-inspector"
                value={draft.inspector}
                onChange={(name) => update("inspector", name)}
                inspectors={inspectorRoster}
              />
              <FieldError message={errors.inspector} />
            </Field>
            <Field>
              <Label htmlFor="f-test">Test date</Label>
              <Input
                id="f-test"
                type="date"
                value={draft.testDate}
                onChange={(e) => update("testDate", e.target.value)}
                required
              />
              <FieldError message={errors.testDate} />
            </Field>
            <Field>
              <Label htmlFor="f-next">Next due date</Label>
              <Input
                id="f-next"
                type="date"
                value={draft.nextDueDate}
                onChange={(e) => update("nextDueDate", e.target.value)}
                required
              />
              <FieldError message={errors.nextDueDate} />
            </Field>
            <Field>
              <Label htmlFor="f-result">Result</Label>
              <Select
                id="f-result"
                value={draft.result}
                onChange={(e) =>
                  update("result", e.target.value as InspectionResult)
                }
              >
                <option value="pass">Pass</option>
                <option value="review">Review required</option>
                <option value="failed">Failed</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="f-proof">Proof load / method</Label>
              <Input
                id="f-proof"
                value={draft.proofLoad}
                onChange={(e) => update("proofLoad", e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <Label htmlFor="f-drawing">Drawing reference</Label>
            <Input
              id="f-drawing"
              value={draft.drawingRef}
              onChange={(e) => update("drawingRef", e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="f-notes">Inspection notes</Label>
            <Textarea
              id="f-notes"
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
              maxLength={2000}
              placeholder="Flashing, fasteners, label, NFC verified, deficiencies, follow-up actions…"
            />
            <FieldError message={errors.notes} />
          </Field>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Attached photos</Label>
              <PhotoUpload
                photos={draft.photos}
                onChange={(p) => update("photos", p)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Inspector signature</Label>
              <SignaturePad
                value={draft.signature}
                onChange={(v) => update("signature", v)}
              />
              <FieldError message={errors.signature} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" onClick={() => router.back()}>
              <X size={16} /> Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !draft.signature}
              title={
                !draft.signature ? "Sign before submitting." : undefined
              }
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}{" "}
              {submitting
                ? "Saving…"
                : editingId
                  ? "Update inspection"
                  : "Save inspection"}
            </Button>
          </div>
        </form>
      </Card>

    </>
  );
}
