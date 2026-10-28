import { BarTrack } from './bar-track';

interface BarRowProps {
  label: React.ReactNode;
  value: number;
  max: number;
  color: string; // any CSS color, because project colors come from the database
  showDot?: boolean;
}

export function BarRow({ label, value, max, color, showDot = true }: BarRowProps) {
  return (
    <div className="flex items-center gap-3">
      {showDot && (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
      <BarTrack percent={(value / max) * 100} color={color} className="flex-1" />
      <span className="w-6 text-right font-mono text-xs text-text-muted">{value}</span>
    </div>
  );
}
