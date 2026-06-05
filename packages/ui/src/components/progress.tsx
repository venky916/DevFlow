import { cn } from "../lib/cn";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-1 w-full rounded-full bg-bg-overlay overflow-hidden",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
