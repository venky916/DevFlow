import { cn } from "../lib/cn";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-accent-subtle text-accent font-medium shrink-0",
        sizeMap[size],
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="rounded-full w-full h-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
