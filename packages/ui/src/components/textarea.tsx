import { cn } from '../lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
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
      <textarea
        id={id}
        className={cn(
          'min-h-[80px] w-full resize-none rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 py-2 text-sm text-text-primary transition-colors placeholder:text-text-disabled',
          'focus:border-accent focus:outline-none',
          error && 'border-danger-text',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
