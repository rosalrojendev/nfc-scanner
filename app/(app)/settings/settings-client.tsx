"use client";

import * as React from "react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resetServerStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";

export function SettingsClient() {
  const { notify } = useToast();
  const session = useSession();
  const role = session.role;
  const isAdmin = can.manageUsers(role);
  const canReset = can.resetStore(role);

  async function reset() {
    if (
      !confirm(
        "Reset all anchors and inspections on the server back to seed data?",
      )
    )
      return;
    try {
      await resetServerStore();
      notify("Server store reset to seed data.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Reset failed.", "error");
    }
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>{isAdmin ? "Admin tools" : "Account"}</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              {isAdmin
                ? "Inspectors, reminders, and system settings"
                : `Signed in as ${session.name}`}
            </h1>
            {!isAdmin ? (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Role: <strong>{role}</strong>. Admin tools are not available
                for your role.
              </p>
            ) : null}
          </div>
          <Badge variant={isAdmin ? "blue" : "default"}>
            {role.toUpperCase()}
          </Badge>
        </div>
        {isAdmin ? (
          <div className="grid lg:grid-cols-3 gap-3">
            <article className="p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-2">
              <strong>Authorized inspectors</strong>
              <p className="text-sm text-[var(--color-text-muted)]">
                Justin Kamata, A. Singh, L. Foster, M. Reed, and S. Chen are
                active and can sign records.
              </p>
              <Button>Manage users</Button>
            </article>
            <article className="p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-2">
              <strong>Reminders</strong>
              <p className="text-sm text-[var(--color-text-muted)]">
                60, 30, and 7-day alerts enabled for anchors nearing re-test
                due dates.
              </p>
              <Button>Edit schedule</Button>
            </article>
            <article className="p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-2">
              <strong>Client viewers</strong>
              <p className="text-sm text-[var(--color-text-muted)]">
                Limited-access links can show reports without exposing edit
                controls.
              </p>
              <Button>Share report link</Button>
            </article>
          </div>
        ) : null}
      </Card>

      <Card>
        <div>
          <Eyebrow>Appearance</Eyebrow>
          <h2 className="text-lg font-semibold tracking-tight mt-1">
            Theme and accessibility
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ThemeToggle />
          <p className="text-sm text-[var(--color-text-muted)]">
            Dark mode is recommended for sun-bright roof conditions.
          </p>
        </div>
      </Card>

      {canReset ? (
        <Card>
          <div>
            <Eyebrow>Data</Eyebrow>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              Local persistence
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Anchor metadata and inspection records are saved to localStorage on
            this device. They survive reloads but are not synced anywhere.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset}>
              <RotateCcw size={16} /> Reset to seed data
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <div>
          <Eyebrow>Security</Eyebrow>
          <h2 className="text-lg font-semibold tracking-tight mt-1 inline-flex items-center gap-2">
            <ShieldCheck size={18} /> What is enforced
          </h2>
        </div>
        <ul className="text-sm text-[var(--color-text-muted)] grid gap-1 list-disc pl-4">
          <li>Passwords hashed with bcrypt (cost 10) before comparison.</li>
          <li>JWT session in HTTP-only, Secure, SameSite=Strict cookies.</li>
          <li>Server-side Zod validation on every input.</li>
          <li>Login rate-limited per IP (8 attempts / minute).</li>
          <li>
            Strict Content-Security-Policy, X-Frame-Options DENY, HSTS, and
            Permissions-Policy lock down camera + NFC to first-party only.
          </li>
          <li>Middleware redirects unauthenticated requests to /login.</li>
        </ul>
      </Card>
    </>
  );
}
