'use client';

import { useEffect, useRef, useState } from 'react';

import { socketClient } from '../../lib/socket-client';
import { useAuthStore } from '../../stores/auth.store';

const SEND_EVERY_MS = 100; // about 10 positions a second
const CURSOR_LIFETIME_MS = 5000; // a pointer that stops moving fades after this
const SWEEP_EVERY_MS = 1000;

export interface RemoteCursor {
  userId: string;
  name: string;
  x: number; // a fraction of the board's width (0 to 1)
  y: number; // pixels from the top of the board's content
  seenAt: number;
}

// Sends this person's mouse position while it is over the board area.
// scrollRef is the board's scrolling box. contentRef is the inner box that holds the columns.
// The listener is on window (not on the board), because the floating card of a drag sits outside
// the board and would swallow the events.
export function useCursorSender(projectId: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    let lastSentAt = 0;
    let isInside = false;

    const send = (type: 'CURSOR_MOVE' | 'CURSOR_LEAVE', extra: object = {}) =>
      socketClient.sendMessage({ type, payload: { projectId, ...extra } });

    const leave = () => {
      if (!isInside) return;
      isInside = false;
      send('CURSOR_LEAVE');
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return; // touch screens have no pointer to show
      const scroller = scrollRef.current?.getBoundingClientRect();
      const content = contentRef.current?.getBoundingClientRect();
      if (!scroller || !content) return;

      const inside =
        event.clientX >= scroller.left &&
        event.clientX <= scroller.right &&
        event.clientY >= scroller.top &&
        event.clientY <= scroller.bottom;
      if (!inside) {
        leave();
        return;
      }

      isInside = true;
      const now = Date.now();
      if (now - lastSentAt < SEND_EVERY_MS) return;
      lastSentAt = now;

      const x = Math.min(1, Math.max(0, (event.clientX - content.left) / content.width));
      const y = Math.max(0, event.clientY - content.top);
      send('CURSOR_MOVE', { x, y });
    };

    window.addEventListener('pointermove', onPointerMove);
    document.documentElement.addEventListener('mouseleave', leave); // the mouse left the window
    window.addEventListener('blur', leave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('mouseleave', leave);
      window.removeEventListener('blur', leave);
      send('CURSOR_LEAVE'); // the board closed, or the view changed to the list
    };
  }, [projectId]);

  return { scrollRef, contentRef };
}

// The other people's pointers on this project's board. Each one fades if it stops moving.
export function useRemoteCursors(projectId: string): RemoteCursor[] {
  const myId = useAuthStore((state) => state.user?.id);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});

  useEffect(() => {
    if (!projectId) return;

    const stopListening = socketClient.subscribe((message) => {
      const payload = message.payload ?? {};
      if (payload.projectId !== projectId) return;

      if (message.type === 'CURSOR_MOVE') {
        const { userId, name, x, y } = payload;
        if (
          typeof userId !== 'string' ||
          typeof name !== 'string' ||
          typeof x !== 'number' ||
          typeof y !== 'number'
        ) {
          return;
        }
        setCursors((prev) => ({ ...prev, [userId]: { userId, name, x, y, seenAt: Date.now() } }));
      } else if (message.type === 'CURSOR_LEAVE' && typeof payload.userId === 'string') {
        const userId = payload.userId;
        setCursors((prev) => {
          if (!(userId in prev)) return prev;
          const { [userId]: _gone, ...rest } = prev;
          return rest;
        });
      }
    });

    // pointers that stopped moving disappear
    const sweep = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const alive = Object.entries(prev).filter(([, c]) => now - c.seenAt < CURSOR_LIFETIME_MS);
        return alive.length === Object.keys(prev).length ? prev : Object.fromEntries(alive);
      });
    }, SWEEP_EVERY_MS);

    return () => {
      stopListening();
      clearInterval(sweep);
    };
  }, [projectId]);

  // you know where your own mouse is
  return Object.values(cursors).filter((cursor) => cursor.userId !== myId);
}
