import type { BoardColumns, BoardStatus, IBoard } from '@devflow/types';

export const BOARD_STATUSES: BoardStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export function findColumn(columns: BoardColumns, issueId: string): BoardStatus | null {
  return BOARD_STATUSES.find((status) => columns[status].some((i) => i.id === issueId)) ?? null;
}

// same order as the server: position, then id
export function byPosition(
  a: { position: string; id: string },
  b: { position: string; id: string },
) {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

// The board as it will look after a move. Used for the instant update before the server answers.
// Without a position the card goes to the end of its column, like the server does.
export function moveIssueInBoard(
  board: IBoard,
  issueId: string,
  status: BoardStatus,
  position?: string,
): IBoard {
  const from = findColumn(board.columns, issueId);
  if (!from) return board;

  const issue = board.columns[from].find((i) => i.id === issueId);
  if (!issue) return board;

  const moved = { ...issue, status, position: position ?? issue.position };
  const columns: BoardColumns = { ...board.columns };
  columns[from] = board.columns[from].filter((i) => i.id !== issueId);

  const target = [...columns[status], moved];
  columns[status] = position ? target.sort(byPosition) : target;

  return { ...board, columns };
}
