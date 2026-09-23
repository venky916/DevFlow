"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@devflow/ui/components/button";

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function PageError({
  message = "Something went wrong",
  onRetry,
}: PageErrorProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-4">
      <AlertCircle className="h-6 w-6 text-danger-text" />
      <p className="text-[13px] text-text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
