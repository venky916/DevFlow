'use client';

import { useRemoteCursors } from '../../hooks/events/use-board-cursors';
import { userColor } from '../../lib/user-color';

// The other people's mouse pointers, drawn over the board.
export function LiveCursors({ projectId }: { projectId: string }) {
  const cursors = useRemoteCursors(projectId);
  if (cursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      {cursors.map((cursor) => {
        const color = userColor(cursor.userId);
        return (
          <div
            key={cursor.userId}
            className="absolute transition-[left,top] duration-100 ease-linear"
            style={{ left: `${cursor.x * 100}%`, top: cursor.y }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              style={{ color }}
              className="drop-shadow-md"
            >
              <path
                d="M2 1l11 6.5-4.8 1.3L6.3 14 2 1z"
                fill="currentColor"
                stroke="#0a0a0a"
                strokeWidth="1"
              />
            </svg>
            <span
              className="-mt-1 ml-3 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-black"
              style={{ backgroundColor: color }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
