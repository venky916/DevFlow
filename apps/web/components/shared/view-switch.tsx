import { cn } from '@devflow/ui/lib/cn';

export const BOARD_VIEWS = [
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
] as const;

interface ViewSwitchProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function ViewSwitch<T extends string>({ options, value, onChange }: ViewSwitchProps<T>) {
  return (
    <div className="flex items-center overflow-hidden rounded-[4px] border border-border-default">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'h-7 px-2.5 text-[12px] transition-colors',
            value === option.value
              ? 'bg-bg-active text-text-primary'
              : 'text-text-muted hover:text-text-primary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
