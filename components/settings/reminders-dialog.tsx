"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { setReminder, useSettings } from "@/lib/settings-store";
import { Bell, BellOff } from "lucide-react";

interface RemindersDialogProps {
  open: boolean;
  onClose: () => void;
}

const SCHEDULE: Array<{
  key: "sixtyDay" | "thirtyDay" | "sevenDay";
  days: number;
  label: string;
  description: string;
}> = [
  {
    key: "sixtyDay",
    days: 60,
    label: "60-day reminder",
    description: "Heads-up to schedule the next inspection.",
  },
  {
    key: "thirtyDay",
    days: 30,
    label: "30-day reminder",
    description: "Hard reminder to assign an inspector.",
  },
  {
    key: "sevenDay",
    days: 7,
    label: "7-day reminder",
    description: "Final notice before the anchor goes overdue.",
  },
];

export function RemindersDialog({ open, onClose }: RemindersDialogProps) {
  const settings = useSettings();
  const { notify } = useToast();

  function toggle(key: "sixtyDay" | "thirtyDay" | "sevenDay") {
    const next = !settings.reminders[key];
    setReminder(key, next);
    notify(
      next
        ? `${key.replace("Day", " day")} reminder enabled.`
        : `${key.replace("Day", " day")} reminder disabled.`,
      next ? "success" : "default",
    );
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Reminder schedule">
      <Eyebrow>Reminders</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">
        Re-test reminder schedule
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Each enabled interval triggers a notification ahead of an anchor's
        retest due date.
      </p>

      <div className="grid gap-2">
        {SCHEDULE.map((row) => {
          const active = settings.reminders[row.key];
          return (
            <button
              type="button"
              key={row.key}
              onClick={() => toggle(row.key)}
              aria-pressed={active}
              className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: active
                  ? "color-mix(in srgb, var(--color-primary) 32%, transparent)"
                  : "var(--color-border)",
                background: active
                  ? "var(--color-primary-highlight)"
                  : "var(--color-surface-2)",
              }}
            >
              <div
                className="w-10 h-10 shrink-0 rounded-full grid place-items-center"
                style={{
                  background: active
                    ? "var(--color-primary)"
                    : "var(--color-surface)",
                  color: active
                    ? "var(--color-text-inverse)"
                    : "var(--color-text-muted)",
                }}
                aria-hidden
              >
                {active ? <Bell size={16} /> : <BellOff size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block">{row.label}</strong>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {row.description}
                </span>
              </div>
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{
                  color: active
                    ? "var(--color-primary)"
                    : "var(--color-text-faint)",
                }}
              >
                {active ? "On" : "Off"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}
