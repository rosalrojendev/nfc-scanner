"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { Field, FieldError, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/shell/session-provider";
import { refetchAll } from "@/lib/settings-store";
import { Save, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function EditProfileDialog({ open, onClose }: Props) {
  const router = useRouter();
  const { notify } = useToast();
  const session = useSession();
  const [name, setName] = React.useState(session.name);
  const [email, setEmail] = React.useState(session.email);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(session.name);
      setEmail(session.email);
      setCurrentPassword("");
      setNewPassword("");
      setErrors({});
    }
  }, [open, session.name, session.email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const body: Record<string, string> = {};
    if (name.trim() && name.trim() !== session.name) body.name = name.trim();
    if (email.trim() && email.trim().toLowerCase() !== session.email) {
      body.email = email.trim();
    }
    if (newPassword) {
      if (!currentPassword) {
        setErrors({
          currentPassword: "Enter your current password to change it.",
        });
        return;
      }
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    if (Object.keys(body).length === 0) {
      notify("Nothing to update.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Update failed (${r.status})`);
      }
      notify("Profile updated.", "success");
      // Refresh session-bound bits + settings; bounce to refetch the new
      // session cookie's name/email in the layout.
      await refetchAll();
      router.refresh();
      onClose();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Edit your profile">
      <Eyebrow>Account</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">Edit profile</h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Update your name, email, or password. Leave password fields empty to
        keep your current password.
      </p>
      <form className="grid gap-3" onSubmit={submit} noValidate>
        <Field>
          <Label htmlFor="ep-name">Full name</Label>
          <Input
            id="ep-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <FieldError message={errors.name} />
        </Field>
        <Field>
          <Label htmlFor="ep-email">Email</Label>
          <Input
            id="ep-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <FieldError message={errors.email} />
        </Field>
        <Field>
          <Label htmlFor="ep-current-password">Current password</Label>
          <Input
            id="ep-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Required to change password"
          />
          <FieldError message={errors.currentPassword} />
        </Field>
        <Field>
          <Label htmlFor="ep-new-password">New password</Label>
          <Input
            id="ep-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Leave blank to keep current"
          />
          <FieldError message={errors.newPassword} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
