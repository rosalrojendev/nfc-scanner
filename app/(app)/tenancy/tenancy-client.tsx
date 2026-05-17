"use client";

import { Card, Eyebrow } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { TenancyManager } from "@/components/settings/tenancy-manager";

export function TenancyClient() {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Platform admin</Eyebrow>
          <h1 className="text-xl font-semibold tracking-tight mt-1 inline-flex items-center gap-2">
            <Building2 size={20} /> Tenancy
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Create clients, add projects, and assign members. Changes apply
            immediately and are visible to anyone with access.
          </p>
        </div>
      </div>
      <TenancyManager />
    </Card>
  );
}
