import type { LucideIcon } from "lucide-react";

import { cn } from "@devflow/ui/lib/cn";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  tone?: "default" | "danger";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="rounded-md border border-border-default p-4">
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-text-muted" />}
        <p className="font-mono text-2xs tracking-wider text-text-muted uppercase">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "text-2xl font-semibold",
          tone === "danger" ? "text-danger-text" : "text-text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
