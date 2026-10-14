const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// "abc" or a huge number must not break the query
export function parseLimit(value: unknown, fallback = DEFAULT_PAGE_SIZE): number {
    const parsed = parseInt(String(value), 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE);
}

// Query with take + 1, then pass the rows here. The extra row only answers "is there more?".
export function toCursorPage<T extends { id: string }>(rows: T[], take: number) {
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.id : null;
    return { items, nextCursor, hasMore };
}