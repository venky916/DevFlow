import { cn } from "@devflow/ui/lib/cn";

const SIZES = {
  narrow: "max-w-xl",
  medium: "max-w-2xl",
  default: "max-w-4xl",
  full: "max-w-none",
} as const;

interface PageContainerProps {
  size?: keyof typeof SIZES;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  size = "default",
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-8 py-6",
        SIZES[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
