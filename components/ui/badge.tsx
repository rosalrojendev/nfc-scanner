import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chip = cva(
  "inline-flex items-center gap-1 px-3 py-[0.42rem] rounded-full text-[0.72rem] font-bold border",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]",
        success:
          "bg-[var(--color-success-highlight)] border-transparent text-[var(--color-success)]",
        warning:
          "bg-[var(--color-warning-highlight)] border-transparent text-[var(--color-warning)]",
        error:
          "bg-[var(--color-error-highlight)] border-transparent text-[var(--color-error)]",
        blue: "bg-[var(--color-blue-highlight)] border-transparent text-[var(--color-blue)]",
        primary:
          "bg-[var(--color-primary-highlight)] border-transparent text-[var(--color-primary)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chip> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(chip({ variant }), className)} {...props} />
);
