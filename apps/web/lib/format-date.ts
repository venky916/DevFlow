import { formatDistanceToNow } from 'date-fns';

// API dates are ISO strings. Convert only here, at display time.
export function formatTimeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

// TODO(dates): becomes formatDay (YYYY-MM-DD, no timezone shift) in the date pass
export function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
