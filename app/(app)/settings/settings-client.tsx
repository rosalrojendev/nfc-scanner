"use client";

import * as React from "react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resetServerStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import {
  RotateCcw,
  ShieldCheck,
  Users,
  Bell,
  Link2,
} from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import { ROLE_META } from "@/lib/role-meta";
import {
  activeReminderCount,
  avatarFor,
  useSettings,
} from "@/lib/settings-store";
import { ManageUsersDialog } from "@/components/settings/manage-users-dialog";
import { RemindersDialog } from "@/components/settings/reminders-dialog";
import { ShareLinkDialog } from "@/components/settings/share-link-dialog";
import { MyProfilePhoto } from "@/components/settings/my-profile-photo";
import { Avatar } from "@/components/ui/avatar";

export function SettingsClient() {
  const { notify } = useToast();
  const session = useSession();
  const role = session.role;
  const isAdmin = can.manageUsers(role);
  const canReset = can.resetStore(role);
  const settings = useSettings();

  const [usersOpen, setUsersOpen] = React.useState(false);
  const [remindersOpen, setRemindersOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

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

  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;
  const reminderCount = activeReminderCount(settings);
  const shareCount = settings.shareLinks.length;
  const myAvatar = avatarFor(session.id, session.name, settings);

  const inspectorPreview = React.useMemo(() => {
    const names = settings.inspectors.map((i) => i.name);
    if (names.length === 0) return "No inspectors on the roster.";
    if (names.length <= 4) return names.join(", ") + " — all active.";
    return names.slice(0, 3).join(", ") + `, and ${names.length - 3} more.`;
  }, [settings.inspectors]);

  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <div className="relative shrink-0" aria-hidden>
            <Avatar name={session.name} src={myAvatar} size={64} />
            <span
              className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full"
              style={{
                background: meta.accent,
                color: "var(--color-text-inverse)",
                boxShadow: "0 0 0 2.5px var(--color-surface)",
              }}
            >
              <RoleIcon size={12} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <Eyebrow>Signed in as</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              {session.name}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mr-1"
                style={{
                  background: meta.accentHighlight,
                  color: meta.accent,
                }}
              >
                <RoleIcon size={12} /> {meta.label}
              </span>
              {meta.description}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <div className="grid lg:grid-cols-3 gap-3">
            <article className="p-5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="inline-flex items-center gap-2">
                  <Users size={16} /> Authorized inspectors
                </strong>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  {settings.inspectors.length}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {inspectorPreview}
              </p>
              <Button onClick={() => setUsersOpen(true)}>Manage users</Button>
            </article>
            <article className="p-5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="inline-flex items-center gap-2">
                  <Bell size={16} /> Reminders
                </strong>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  {reminderCount}/3 on
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                {reminderCount === 0
                  ? "No reminders enabled. Re-tests will not be flagged."
                  : `Alerts enabled at ${[
                      settings.reminders.sixtyDay && "60",
                      settings.reminders.thirtyDay && "30",
                      settings.reminders.sevenDay && "7",
                    ]
                      .filter(Boolean)
                      .join(", ")} days before due date.`}
              </p>
              <Button onClick={() => setRemindersOpen(true)}>
                Edit schedule
              </Button>
            </article>
            <article className="p-5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="inline-flex items-center gap-2">
                  <Link2 size={16} /> Client viewers
                </strong>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  {shareCount} active
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                Tokenized URLs let clients see reports without exposing edit
                controls.
              </p>
              <Button onClick={() => setShareOpen(true)}>
                Share report link
              </Button>
            </article>
          </div>
        ) : null}
      </Card>

      <MyProfilePhoto />

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
              Server store
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Anchors and inspections are stored on the server. Reset will
            replace every record on the running server with the seed dataset.
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

      {isAdmin ? (
        <>
          <ManageUsersDialog
            open={usersOpen}
            onClose={() => setUsersOpen(false)}
          />
          <RemindersDialog
            open={remindersOpen}
            onClose={() => setRemindersOpen(false)}
          />
          <ShareLinkDialog
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}
