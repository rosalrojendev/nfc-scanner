"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { loginSchema } from "@/lib/validation";
import type { Role } from "@/lib/types";
import { Anchor, ShieldCheck } from "lucide-react";

const roleOptions: { value: Role; label: string }[] = [
  { value: "inspector", label: "Inspector" },
  { value: "admin", label: "Admin" },
  { value: "client", label: "Client" },
];

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
    <Card className="w-full max-w-md p-6 shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl grid place-items-center"
          style={{
            background: "var(--color-primary-highlight)",
            color: "var(--color-primary)",
          }}
          aria-hidden
        >
          <Anchor size={22} />
        </div>
        <div>
          <strong className="block text-base tracking-tight">
            Anchor Tag Pro
          </strong>
          <span className="block text-xs text-[var(--color-text-muted)]">
            Roof anchor NFC + QR app
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
      <p className="text-xs text-[var(--color-text-muted)] -mt-1">
        Selected role: <strong className="text-[var(--color-text)]">{role}</strong>{" "}
        · demo email{" "}
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
            Try demo bypass
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
    </Card>
  );
}
