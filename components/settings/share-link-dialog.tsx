"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createShareLink,
  revokeShareLink,
  shareLinkUrl,
  useSettings,
} from "@/lib/settings-store";
import { useProjectContext } from "@/components/shell/project-provider";
import { formatDate } from "@/lib/utils";
import { Copy, Link2, Trash2, Check } from "lucide-react";

interface ShareLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShareLinkDialog({ open, onClose }: ShareLinkDialogProps) {
  const settings = useSettings();
  const { notify } = useToast();
  const { currentProject } = useProjectContext();
  const [label, setLabel] = React.useState("");
  const [justCopied, setJustCopied] = React.useState<string | null>(null);

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(url);
      window.setTimeout(() => setJustCopied(null), 1800);
      notify("Link copied to clipboard.", "success");
    } catch {
      notify("Could not copy. Use long-press to copy.", "error");
    }
  }

  async function generate() {
    if (!currentProject) {
      notify("Pick a current project first.", "error");
      return;
    }
    try {
      const link = await createShareLink(
        currentProject.id,
        label || "Shared report",
      );
      setLabel("");
      void copyToClipboard(shareLinkUrl(link.id));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this share link?")) return;
    try {
      await revokeShareLink(id);
      notify("Link revoked.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Share report link">
      <Eyebrow>Client viewer</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">
        Share report link
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Generates a tokenized URL you can hand to a client. Read-only access.
      </p>

      <Field>
        <Label htmlFor="link-label">Label</Label>
        <Input
          id="link-label"
          placeholder="e.g. Kamloops Office Tower Q2"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              generate();
            }
          }}
        />
      </Field>
      <Button variant="primary" onClick={generate}>
        <Link2 size={16} /> Generate link
      </Button>

      {settings.shareLinks.length > 0 ? (
        <>
          <Eyebrow>Active links</Eyebrow>
          <div className="grid gap-2 max-h-[36vh] overflow-auto -mx-1 px-1">
            {settings.shareLinks.map((l) => {
              const url = shareLinkUrl(l.id);
              const isCopied = justCopied === url;
              return (
                <div
                  key={l.id}
                  className="grid gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate">{l.label}</strong>
                    <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                      {formatDate(l.createdAt)}
                    </span>
                  </div>
                  <code className="text-xs break-all text-[var(--color-text-muted)]">
                    {url}
                  </code>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(url)}
                      variant={isCopied ? "primary" : "default"}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      {isCopied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => revoke(l.id)}
                    >
                      <Trash2 size={14} /> Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}
