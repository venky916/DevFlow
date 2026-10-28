'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="font-mono text-[11px] tracking-[0.03em] text-text-muted uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            'h-9 w-full rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 text-sm text-text-primary transition-colors placeholder:text-text-disabled',
            isPassword && 'pr-9',
            'focus:border-accent focus:outline-none',
            error && 'border-danger-text',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-text-muted transition-colors hover:text-text-primary"
            tabIndex={-1}
            type="button"
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
