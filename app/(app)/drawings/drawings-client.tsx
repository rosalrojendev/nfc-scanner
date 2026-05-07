"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnchors } from "@/lib/store";
import { SEED_DRAWINGS } from "@/lib/seed";
import type { AnchorStatus } from "@/lib/types";
import { Plus, FileUp } from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";

const statusColor: Record<AnchorStatus, string> = {
  pass: "var(--color-success)",
  due: "var(--color-warning)",
  failed: "var(--color-error)",
};

export function DrawingsClient() {
  const router = useRouter();
  const anchors = useAnchors();
  const session = useSession();
  const canUpload = can.uploadDrawings(session.role);

  const drawings = React.useMemo(() => {
    return SEED_DRAWINGS.map((d) => ({
      ...d,
      anchors: d.anchors.map((pin) => {
        const live = anchors.find((a) => a.id === pin.id);
        return live ? { ...pin, status: live.status } : pin;
      }),
    }));
  }, [anchors]);

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Drawing library</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              Roof plans linked to buildings and anchors
            </h1>
          </div>
          {canUpload ? (
            <Button>
              <FileUp size={16} /> Upload plan
            </Button>
          ) : null}
        </div>
      </Card>

      {drawings.map((d) => (
        <Card key={d.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong>
                {d.building} · {d.level}
              </strong>
              <p className="text-sm text-[var(--color-text-muted)]">
                {d.anchors.length} anchors pinned · PDF + image markup
              </p>
            </div>
            <Badge variant="blue">{d.reference}</Badge>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <svg
              viewBox="0 0 760 420"
              role="img"
              aria-label={`${d.building} roof plan`}
              className="w-full h-auto"
            >
              <rect
                x="30"
                y="30"
                width="700"
                height="360"
                rx="22"
                fill="none"
                stroke="currentColor"
                opacity="0.18"
                strokeWidth="2"
              />
              <rect
                x="90"
                y="80"
                width="180"
                height="110"
                rx="14"
                fill="currentColor"
                opacity="0.05"
              />
              <rect
                x="495"
                y="88"
                width="150"
                height="95"
                rx="14"
                fill="currentColor"
                opacity="0.05"
              />
              <path
                d="M118 286H624"
                stroke="currentColor"
                opacity="0.2"
                strokeWidth="2"
                strokeDasharray="8 8"
              />
              <path
                d="M384 54V340"
                stroke="currentColor"
                opacity="0.18"
                strokeWidth="2"
                strokeDasharray="8 8"
              />
              {d.anchors.map((pin) => (
                <g
                  key={pin.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/anchors/${encodeURIComponent(pin.id)}`)}
                  role="button"
                  aria-label={`Open anchor ${pin.id}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      router.push(`/anchors/${encodeURIComponent(pin.id)}`);
                    }
                  }}
                >
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r="22"
                    fill="none"
                    stroke={statusColor[pin.status]}
                    strokeWidth="3"
                    opacity="0.4"
                  />
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r="14"
                    fill={statusColor[pin.status]}
                  />
                  <text
                    x={pin.x + 22}
                    y={pin.y + 4}
                    fontSize="14"
                    fill="currentColor"
                  >
                    {pin.id}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          {canUpload ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">
                <Plus size={16} /> Pin anchor
              </Button>
              <Button>Add detail sheet</Button>
              <Button>Attach PDF</Button>
            </div>
          ) : null}
        </Card>
      ))}
    </>
  );
}
