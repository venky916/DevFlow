import { generateKeyBetween } from "fractional-indexing";

interface HasPosition {
    id: string;
    position: string;
}

// Computes the fractional key for an item landing at `dropIndex` inside
// `list`, where `list` is the DESTINATION array with the dragged item
// already removed. Used identically for board columns, sprint sections,
// and the backlog section — same-column reorder, cross-column moves,
// and cross-section moves all reduce to this one calculation.
export function getFractionalPosition(list: HasPosition[], dropIndex: number): string {
    const before = list[dropIndex - 1]?.position ?? null;
    const after = list[dropIndex]?.position ?? null;
    return generateKeyBetween(before, after);
}