interface Props {
  label: string;
  children: React.ReactNode;
}

export function FieldRow({ label, children }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted w-[80px] shrink-0">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
