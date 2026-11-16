import type { IPresenceHint, PresenceActionKind } from '@devflow/types';

const VERBS: Record<PresenceActionKind, string> = {
  commenting: 'is typing a comment',
  editing: 'is editing the issue',
  uploading: 'is uploading a file',
};

// "Ravi is typing a comment…", or "Ravi is typing a comment (+1 more)"
export function describeHints(hints: IPresenceHint[]): string | null {
  const [first, ...others] = hints;
  if (!first) return null;
  const text = `${first.user.name} ${VERBS[first.kind]}`;
  return others.length > 0 ? `${text} (+${others.length} more)` : `${text}…`;
}
