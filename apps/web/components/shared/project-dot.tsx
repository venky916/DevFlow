import { DEFAULT_PROJECT_COLOR } from "@devflow/ui/components/color-picker";
import { cn } from "@devflow/ui/lib/cn";

const SIZES = {
  sm: "size-1.5", // 6px, dropdown rows
  md: "size-1.75", // 7px, sidebar
} as const;

interface ProjectDotProps {
  color: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

// the color is a runtime value from the database, so it goes in inline style
export function ProjectDot({ color, size = "md", className }: ProjectDotProps) {
  return (
    <span
      className={cn("shrink-0 rounded-full", SIZES[size], className)}
      style={{ backgroundColor: color ?? DEFAULT_PROJECT_COLOR }}
    />
  );
}
