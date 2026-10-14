import { cn } from "../lib/cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "current";
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

const toneMap = {
  accent: "border-accent",
  current: "border-current",
};

export function Spinner({
  className,
  size = "md",
  tone = "accent",
}: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block rounded-full border-2 animate-spin",
        toneMap[tone],
        "border-t-transparent", // keep AFTER the tone class
        sizeMap[size],
        className,
      )}
    />
  );
}
