import { cn } from "../lib/cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full border-2 border-accent border-t-transparent animate-spin",
        sizeMap[size],
        className,
      )}
    />
  );
}
