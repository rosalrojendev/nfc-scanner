"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[14px] border font-semibold transition-[transform,box-shadow,background] duration-200 active:translate-y-[1px] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]",
        primary:
          "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]",
        ghost:
          "bg-transparent border-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
        danger:
          "bg-[var(--color-error-highlight)] border-transparent text-[var(--color-error)] hover:opacity-90",
      },
      size: {
        default: "min-h-[46px] px-4 text-[0.95rem]",
        sm: "min-h-[36px] px-3 text-[0.85rem] rounded-[10px]",
        lg: "min-h-[52px] px-5 text-[1rem]",
        icon: "min-w-[44px] min-h-[44px] w-11 h-11 p-0 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
