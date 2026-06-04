"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className,
  id,
  type,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-[0.03em] text-text-muted font-mono"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          className={cn(
            "h-9 w-full rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 text-sm text-text-primary placeholder:text-text-disabled transition-colors",
            isPassword && "pr-9",
            "focus:outline-none focus:border-accent",
            error && "border-danger-text",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
