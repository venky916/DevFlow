import { cn } from "@devflow/ui/lib/cn";


interface BarTrackProps {
  percent: number;
  color?: string; // runtime color (project, status). Use fillClassName for theme colors
  fillClassName?: string;
  className?: string; // sizing: flex-1 inside a row, w-full on its own
}

export function BarTrack({
  percent,
  color,
  fillClassName,
  className,
}: BarTrackProps) {
  return (
    <div
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-bg-surface",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", fillClassName)}
        style={{
          width: `${Math.min(Math.max(percent, 0), 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
