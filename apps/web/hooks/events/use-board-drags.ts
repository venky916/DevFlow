'use client';

import { useEffect, useMemo, useState } from 'react';

import { socketClient } from '../../lib/socket-client';

const SETTLE_MS = 3000; // after a drop, wait this long for the card to actually move
const STALE_MS = 60_000; // a drag that never ended (it should not happen) is dropped after this

export interface RemoteDrag {
  issueId: string;
  userId: string;
  name: string;
  settling: boolean; // dropped, and waiting for the card to move
  since: number;
}

// Which cards other people are holding right now, keyed by issue id.
export function useRemoteDrags(projectId: string): Record<string, RemoteDrag> {
  const [drags, setDrags] = useState<Record<string, RemoteDrag>>({});

  useEffect(() => {
    if (!projectId) return;
    const settleTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const remove = (issueId: string) => {
      const timer = settleTimers.get(issueId);
      if (timer) clearTimeout(timer);
      settleTimers.delete(issueId);
      setDrags((prev) => {
        if (!(issueId in prev)) return prev;
        const { [issueId]: _gone, ...rest } = prev;
        return rest;
      });
    };

    const stopListening = socketClient.subscribe((message) => {
      const payload = message.payload ?? {};

      // the card has moved, so the marker has done its job
      if (message.type === 'ISSUE_MOVED' && typeof payload.issueId === 'string') {
        remove(payload.issueId);
        return;
      }
      if (payload.projectId !== projectId) return;

      if (message.type === 'DRAG_START') {
        const { issueId, userId, name } = payload;
        if (typeof issueId !== 'string' || typeof userId !== 'string' || typeof name !== 'string') {
          return;
        }
        const timer = settleTimers.get(issueId);
        if (timer) clearTimeout(timer);
        settleTimers.delete(issueId);
        setDrags((prev) => ({
          ...prev,
          [issueId]: { issueId, userId, name, settling: false, since: Date.now() },
        }));
      } else if (message.type === 'DRAG_END' && typeof payload.issueId === 'string') {
        const issueId = payload.issueId;
        if (payload.dropped === true) {
          // keep the marker until the card jumps (ISSUE_MOVED), or until the timeout
          setDrags((prev) =>
            prev[issueId] ? { ...prev, [issueId]: { ...prev[issueId], settling: true } } : prev,
          );
          const old = settleTimers.get(issueId);
          if (old) clearTimeout(old);
          settleTimers.set(
            issueId,
            setTimeout(() => remove(issueId), SETTLE_MS),
          );
        } else {
          remove(issueId); // cancelled or dropped back: nothing is going to move
        }
      }
    });

    const sweep = setInterval(() => {
      setDrags((prev) => {
        const now = Date.now();
        const alive = Object.entries(prev).filter(
          ([, d]) => d.settling || now - d.since < STALE_MS,
        );
        return alive.length === Object.keys(prev).length ? prev : Object.fromEntries(alive);
      });
    }, 5000);

    return () => {
      stopListening();
      clearInterval(sweep);
      settleTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [projectId]);

  return drags;
}

// Tells the others which card you picked up, and when you let go of it.
export function useAnnounceDrag(projectId: string) {
  return useMemo(
    () => ({
      start(issueId: string) {
        socketClient.sendMessage({ type: 'DRAG_START', payload: { projectId, issueId } });
      },
      end(issueId: string, dropped: boolean) {
        socketClient.sendMessage({ type: 'DRAG_END', payload: { projectId, issueId, dropped } });
      },
    }),
    [projectId],
  );
}
