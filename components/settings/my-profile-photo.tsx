"use client";

import * as React from "react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/shell/session-provider";
import { avatarFor, setMyAvatar, useSettings } from "@/lib/settings-store";
import { uploadAvatar } from "@/lib/avatar-upload";
import { ROLE_META } from "@/lib/role-meta";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";

export function MyProfilePhoto() {
  const session = useSession();
  const settings = useSettings();
  const { notify } = useToast();
  const cameraRef = React.useRef<HTMLInputElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  const meta = ROLE_META[session.role];
  const RoleIcon = meta.icon;
  const avatar = avatarFor(session.id, session.name, settings);

  async function upload(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadAvatar(file);
      setMyAvatar(session.id, session.name, url);
      notify("Profile photo updated.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setMyAvatar(session.id, session.name, null);
    notify("Profile photo removed.");
  }

  return (
    <Card>
      <div>
        <Eyebrow>My profile</Eyebrow>
        <h2 className="text-lg font-semibold tracking-tight mt-1">
          Profile photo
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Used on your inspection records, in the inspector picker, and in the
          top bar.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Avatar name={session.name} src={avatar} size={88} />
          <span
            aria-hidden
            className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-7 h-7 rounded-full"
            style={{
              background: meta.accent,
              color: "var(--color-text-inverse)",
              boxShadow: "0 0 0 3px var(--color-surface)",
            }}
          >
            <RoleIcon size={14} />
          </span>
          {busy ? (
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white"
            >
              <Loader2 size={20} className="animate-spin" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <strong className="block">{session.name}</strong>
          <span className="text-sm text-[var(--color-text-muted)]">
            {avatar ? "Photo on file" : "Initials shown until you upload"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
        >
          <Camera size={16} /> Take photo
        </Button>
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>
          <ImagePlus size={16} /> Upload from device
        </Button>
        {avatar ? (
          <Button variant="danger" onClick={clear} disabled={busy}>
            <X size={16} /> Remove photo
          </Button>
        ) : null}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}
