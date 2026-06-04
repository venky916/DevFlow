import { cn } from "../lib/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
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
      <textarea
        id={id}
        className={cn(
          "w-full min-h-[80px] rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled transition-colors resize-none",
          "focus:outline-none focus:border-accent",
          error && "border-danger-text",
          className,
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
