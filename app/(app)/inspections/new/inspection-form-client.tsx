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
  getAnchor,
} from "@/lib/store";
import { inspectionInputSchema } from "@/lib/validation";
import { useSettings } from "@/lib/settings-store";
import type { Inspection, InspectionResult } from "@/lib/types";
import { ClipboardCheck, Save, X, Loader2 } from "lucide-react";
import { NfcWriter } from "@/components/scan/nfc-writer";
import { buildPayload } from "@/lib/nfc-payload";
import { uploadFiles } from "@/lib/uploadthing";

async function dataUrlToFile(
  dataUrl: string,
  filename = "signature.png",
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
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
  const inspectorRoster = settings.inspectors;

  const editingId = params.get("id");
  const presetAnchor = params.get("anchor") || "";

  const [draft, setDraft] = React.useState<Inspection>(() => {
    if (editingId) {
      const existing = getInspection(editingId);
      if (existing) return existing;
    }
    return emptyDraft(presetAnchor, inspectorRoster[0]?.name || "");
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [savedInspection, setSavedInspection] =
    React.useState<Inspection | null>(null);
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
      const saved = editingId
        ? await updateInspection(editingId, payload)
        : await createInspection(payload);
      setSavedInspection(saved);
      notify(
        editingId
          ? "Inspection updated. Anchor record refreshed."
          : "Inspection saved. Next retest date updated.",
        "success",
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function finishAndOpenAnchor() {
    router.push(`/anchors/${encodeURIComponent(draft.anchorId)}`);
  }

  const savedAnchor = savedInspection
    ? getAnchor(savedInspection.anchorId)
    : null;

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

      {savedInspection && savedAnchor ? (
        <Card>
          <div>
            <Eyebrow>Saved</Eyebrow>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              Update the NFC tag with this inspection?
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Encodes asset ID, inspector, timestamp, status, and a short
              note. Photos remain in cloud storage and are linked from the
              anchor record.
            </p>
          </div>
          <NfcWriter
            payload={buildPayload({
              anchor: savedAnchor,
              inspection: savedInspection,
            })}
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={finishAndOpenAnchor}>Skip — open anchor</Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <div>
          <Eyebrow>Tips</Eyebrow>
          <h2 className="text-base font-semibold mt-1 inline-flex items-center gap-2">
            <ClipboardCheck size={16} /> Field-friendly defaults
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            Missing fields are caught with inline errors. Photos upload to
            cloud storage; only the URL is saved with the inspection. Signatures
            stay on the device.
          </p>
        </div>
      </Card>
    </>
  );
}
