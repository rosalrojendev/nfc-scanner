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
import { signupSchema } from "@/lib/validation";
import { Sparkles, UserPlus, Loader2 } from "lucide-react";

type Role = "inspector" | "client";

const roleOptions = [
  { value: "client" as const, label: "Company / org admin" },
  { value: "inspector" as const, label: "Inspector" },
];

export function SignupClient() {
  const router = useRouter();
  const { notify } = useToast();
  const [role, setRole] = React.useState<Role>("client");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      ...(role === "client"
        ? {
            companyName: companyName.trim(),
            projectName: projectName.trim() || undefined,
          }
        : {}),
    };
    const parsed = signupSchema.safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || "form";
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Signup failed (${res.status})`);
      }
      notify("Account created. Welcome!", "success");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Signup failed.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-[440px]">
      <div className="flex items-center gap-3">
        <div
          className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0"
          style={{ boxShadow: "var(--shadow-sm)" }}
          aria-hidden
        >
          <Image
            src="/kra-logo.png"
            alt=""
            fill
            sizes="44px"
            priority
            className="object-cover"
          />
        </div>
        <div>
          <Eyebrow>Anchor Tag Pro</Eyebrow>
          <h1 className="text-xl font-semibold tracking-tight">
            Create your account
          </h1>
        </div>
      </div>

      <Segmented<Role>
        value={role}
        onChange={setRole}
        options={roleOptions}
      />

      <p className="text-sm text-[var(--color-text-muted)]">
        {role === "client" ? (
          <>
            <Sparkles size={12} className="inline mr-1" />
            You&apos;ll create a new company and become its admin — manage
            projects, anchors, drawings, and inspectors.
          </>
        ) : (
          <>
            <Sparkles size={12} className="inline mr-1" />
            You&apos;ll get an inspector account. A client admin will add you
            to their roster so you can log inspections.
          </>
        )}
      </p>

      <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
        <Field>
          <Label htmlFor="su-name">Full name</Label>
          <Input
            id="su-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Justin Kamata"
            autoComplete="name"
          />
          <FieldError message={errors.name} />
        </Field>
        <Field>
          <Label htmlFor="su-email">Email</Label>
          <Input
            id="su-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
          <FieldError message={errors.email} />
        </Field>
        <Field>
          <Label htmlFor="su-password">Password</Label>
          <Input
            id="su-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <FieldError message={errors.password} />
        </Field>

        {role === "client" ? (
          <>
            <Field>
              <Label htmlFor="su-company">Company / organization name</Label>
              <Input
                id="su-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Heights Property Group"
                autoComplete="organization"
              />
              <FieldError message={errors.companyName} />
            </Field>
            <Field>
              <Label htmlFor="su-project">First project name (optional)</Label>
              <Input
                id="su-project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Riverside Complex"
              />
              <FieldError message={errors.projectName} />
              <p className="text-xs text-[var(--color-text-muted)]">
                You can add more projects later.
              </p>
            </Field>
          </>
        ) : null}

        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-sm text-center text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  );
}
