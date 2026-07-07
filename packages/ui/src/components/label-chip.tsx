import { cn } from "@devflow/ui/lib/cn";

interface LabelChipProps {
  name: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}

export function LabelChip({
  name,
  color,
  size = "sm",
  className,
}: LabelChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] font-medium",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-[12px]",
        className,
      )}
      style={{
        backgroundColor: `${color}1F`, // ~12% opacity tint
        color: color,
      }}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        )}
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
