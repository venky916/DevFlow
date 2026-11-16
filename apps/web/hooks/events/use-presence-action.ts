'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { PresenceActionKind } from '@devflow/types';

import { socketClient } from '../../lib/socket-client';

const MIN_GAP_MS = 2000; // the same hint is sent at most this often

// Tells the others on this issue what you are doing right now ("typing a comment").
// report() is safe to call on every keystroke. stop() ends the hint at once.
export function usePresenceAction(issueId: string) {
  const sent = useRef<{ kind: PresenceActionKind; at: number } | null>(null);

  const actions = useMemo(() => {
    const send = (kind: PresenceActionKind | null) => {
      socketClient.sendMessage({ type: 'PRESENCE_ACTION', payload: { issueId, kind } });
    };

    return {
      report(kind: PresenceActionKind) {
        const now = Date.now();
        const last = sent.current;
        if (last && last.kind === kind && now - last.at < MIN_GAP_MS) return;
        sent.current = { kind, at: now };
        send(kind);
      },
      stop() {
        if (!sent.current) return;
        sent.current = null;
        send(null);
      },
    };
  }, [issueId]);

  // leaving the page ends the hint
  useEffect(() => actions.stop, [actions]);

  return actions;
}
