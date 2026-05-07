"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import type { Inspector } from "@/lib/settings-store";

interface InspectorPickerProps {
  value: string;
  onChange: (name: string) => void;
  inspectors: Inspector[];
  buttonId?: string;
}

export function InspectorPicker({
  value,
  onChange,
  inspectors,
  buttonId,
}: InspectorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const known = inspectors.find((i) => i.name === value);
  const displayName = value || "Select inspector";
  const isUnknown = !!value && !known;

  return (
    <>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen(true)}
        className="
          w-full min-h-[48px] rounded-[14px] border border-[var(--color-border)]
          bg-[var(--color-surface-2)] text-left
          inline-flex items-center gap-3 pr-3 pl-2
          transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]
        "
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Avatar name={value || "?"} src={known?.avatar} size={36} />
        <span className="flex-1 min-w-0">
          <span className="block truncate font-semibold">
            {displayName}
            {isUnknown ? (
              <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
                archived
              </span>
            ) : null}
          </span>
          {known ? null : value ? null : (
            <span className="block text-xs text-[var(--color-text-muted)]">
              Tap to choose from the roster
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-[var(--color-text-muted)]"
          aria-hidden
        />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Choose inspector"
      >
        <Eyebrow>Choose inspector</Eyebrow>
        <h3 className="text-lg font-semibold tracking-tight">
          Roster ({inspectors.length})
        </h3>
        <div className="grid gap-2 max-h-[55vh] overflow-auto -mx-1 px-1">
          {inspectors.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No inspectors on the roster yet. Add one in Settings → Manage
              users.
            </p>
          ) : (
            inspectors.map((insp) => {
              const selected = insp.name === value;
              return (
                <button
                  type="button"
                  key={insp.id}
                  onClick={() => {
                    onChange(insp.name);
                    setOpen(false);
                  }}
                  aria-pressed={selected}
                  className="
                    flex items-center gap-3 p-3 rounded-xl border text-left
                    transition-all duration-200 hover:-translate-y-0.5
                  "
                  style={{
                    borderColor: selected
                      ? "color-mix(in srgb, var(--color-primary) 32%, transparent)"
                      : "var(--color-border)",
                    background: selected
                      ? "var(--color-primary-highlight)"
                      : "var(--color-surface-2)",
                  }}
                >
                  <Avatar name={insp.name} src={insp.avatar} size={40} />
                  <div className="flex-1 min-w-0">
                    <strong className="block truncate">{insp.name}</strong>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Inspector
                    </span>
                  </div>
                  {selected ? (
                    <span
                      className="inline-flex w-7 h-7 items-center justify-center rounded-full"
                      style={{
                        background: "var(--color-primary)",
                        color: "var(--color-text-inverse)",
                      }}
                      aria-label="Selected"
                    >
                      <Check size={14} />
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </Dialog>
    </>
  );
}
