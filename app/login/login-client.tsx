"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { loginSchema } from "@/lib/validation";
import type { Role } from "@/lib/types";
import { ShieldCheck, Sparkles } from "lucide-react";
import { ROLE_META } from "@/lib/role-meta";

const roleOptions = (Object.keys(ROLE_META) as Role[]).map((r) => ({
  value: r,
  label: ROLE_META[r].label,
  icon: ROLE_META[r].icon,
}));

const DEMO_PASSWORD = "AnchorTag!2026";
const DEMO_EMAILS: Record<Role, string> = {
  inspector: "kamata@kamloopsropeaccess.com",
  admin: "admin@kamloopsropeaccess.com",
  client: "client@anchorclient.com",
};
const KNOWN_DEMO_EMAILS = new Set<string>(Object.values(DEMO_EMAILS));

export function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [role, setRoleState] = React.useState<Role>("inspector");
  const [email, setEmail] = React.useState(DEMO_EMAILS.inspector);
  const [password, setPassword] = React.useState(DEMO_PASSWORD);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const setRole = React.useCallback(
    (next: Role) => {
      setRoleState(next);
      setError(null);
      setEmail((current) =>
        KNOWN_DEMO_EMAILS.has(current.trim().toLowerCase())
          ? DEMO_EMAILS[next]
          : current,
      );
      setPassword((current) =>
        current === DEMO_PASSWORD || current === "" ? DEMO_PASSWORD : current,
      );
    },
    [],
  );

  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check your fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Sign-in failed.");
        notify(j.error || "Sign-in failed.", "error");
        return;
      }
      notify("Signed in.", "success");
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Demo sign-in failed.");
        return;
      }
      notify(`Demo ${role} session started.`, "success");
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-7 shadow-[var(--shadow-md)] gap-5">
      <div className="flex items-center gap-3">
        <div
          className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0"
          style={{ boxShadow: "var(--shadow-sm)" }}
          aria-hidden
        >
          <Image
            src="/kra-logo.png"
            alt=""
            fill
            sizes="48px"
            priority
            className="object-cover"
          />
        </div>
        <div className="leading-tight">
          <strong className="block text-base tracking-tight">
            Anchor Tag Pro
          </strong>
          <span className="block text-xs text-[var(--color-text-muted)]">
            Kamloops Rope Access · NFC + QR field app
          </span>
        </div>
      </div>

      <Eyebrow>Inspector access</Eyebrow>
      <h1 className="text-2xl font-semibold tracking-tight">
        Sign in to your field account
      </h1>
      <p className="text-[var(--color-text-muted)] text-sm">
        Role-based access keeps inspectors, admins, and client viewers separated
        while logging every change to an anchor record.
      </p>

      <Segmented<Role>
        ariaLabel="Role picker"
        value={role}
        onChange={setRole}
        options={roleOptions}
      />
      <RoleHint role={role} />
      <p className="text-xs text-[var(--color-text-muted)] -mt-1">
        Demo email:{" "}
        <span className="font-mono">{DEMO_EMAILS[role]}</span>
      </p>

      <form className="grid gap-3" onSubmit={handleSignIn} noValidate>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            spellCheck={false}
          />
        </Field>
        <Field>
          <Label htmlFor="passcode">Passcode</Label>
          <Input
            id="passcode"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <FieldError message={error || undefined} />
        <div className="flex flex-wrap gap-2 mt-1">
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Open dashboard"}
          </Button>
          <Button type="button" onClick={handleDemo} disabled={submitting}>
            <Sparkles size={16} /> Try demo bypass
          </Button>
        </div>
      </form>

      <div
        className="mt-2 p-4 rounded-[1rem] text-sm flex gap-3 items-start"
        style={{ background: "var(--color-primary-highlight)" }}
      >
        <ShieldCheck
          size={18}
          color="var(--color-primary)"
          aria-hidden
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <div>
          <strong className="block text-[0.85rem] text-[var(--color-text)]">
            Demo credentials
          </strong>
          <span className="block text-[0.78rem] text-[var(--color-text-muted)] mt-1">
            Inspector: kamata@kamloopsropeaccess.com<br />
            Admin: admin@kamloopsropeaccess.com<br />
            Client: client@anchorclient.com<br />
            Passcode: <code>AnchorTag!2026</code>
          </span>
        </div>
      </div>
      <p className="text-sm text-center text-[var(--color-text-muted)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          Create one
        </Link>
      </p>
    </Card>
  );
}

function RoleHint({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-2xl border"
      style={{
        background: meta.accentHighlight,
        borderColor: "transparent",
      }}
    >
      <div
        className="w-9 h-9 shrink-0 rounded-xl grid place-items-center"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 70%, transparent)",
          color: meta.accent,
        }}
        aria-hidden
      >
        <Icon size={18} />
      </div>
      <div className="text-[0.85rem] leading-snug">
        <strong className="block text-[var(--color-text)]">{meta.label}</strong>
        <span className="block text-[var(--color-text-muted)] mt-0.5">
          {meta.description}
        </span>
      </div>
    </div>
  );
}
