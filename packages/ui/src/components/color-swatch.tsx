import { cn } from "../lib/cn";

interface ColorSwatchProps {
  color: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function ColorSwatch({
  color,
  size = "sm",
  className,
}: ColorSwatchProps) {
  return (
    <span
      className={cn(
        "rounded-full shrink-0 inline-block",
        size === "xs" && "h-2 w-2",
        size === "sm" && "h-3 w-3",
        size === "md" && "h-4 w-4",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  );
}
