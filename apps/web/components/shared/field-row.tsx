interface Props {
  label: string;
  children: React.ReactNode;
}

export function FieldRow({ label, children }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[80px] shrink-0 font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
