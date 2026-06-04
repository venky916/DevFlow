import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-[3px] px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "bg-success-bg text-success-text",
        warning: "bg-warning-bg text-warning-text",
        danger: "bg-danger-bg  text-danger-text",
        info: "bg-info-bg    text-info-text",
        medium: "bg-medium-bg  text-medium-text",
        neutral: "bg-neutral-bg text-neutral-text",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
