import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  // base styles
  "inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-sm rounded-[4px]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-text hover:bg-accent-hover",
        secondary:
          "bg-transparent text-text-primary border border-border-emphasis hover:bg-bg-hover",
        ghost:
          "bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-hover",
        danger:
          "bg-transparent text-danger-text hover:bg-danger-bg border border-border-emphasis",
      },
      size: {
        sm: "h-7  px-3 text-xs",
        md: "h-8  px-4 text-sm",
        lg: "h-9  px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
