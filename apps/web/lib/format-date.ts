import { formatDistanceToNow } from 'date-fns';

// API dates are ISO strings. Convert only here, at display time.
export function formatTimeAgo(iso: string): string {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
}