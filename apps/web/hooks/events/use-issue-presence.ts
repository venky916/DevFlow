'use client';

import { useEffect, useState } from 'react';

import type { IPresenceHint, IPresenceUser, PresenceActionKind } from '@devflow/types';

import { socketClient } from '../../lib/socket-client';
import { useAuthStore } from '../../stores/auth.store';

const HINT_LIFETIME_MS = 5000; // a hint disappears this long after its last message
const KINDS: PresenceActionKind[] = ['commenting', 'editing', 'uploading'];

const isPresenceUser = (value: unknown): value is IPresenceUser =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as IPresenceUser).id === 'string' &&
  typeof (value as IPresenceUser).name === 'string';

interface PresenceState {
  issueId: string;
  users: IPresenceUser[];
  actions: Record<string, PresenceActionKind>; // userId -> what they are doing
}

// Who else has this issue open, and what they are doing right now.
// The server sends the whole list when we join (and again after a reconnect), then one message
// each time someone arrives, leaves, or starts or stops an action.
export function useIssuePresence(issueId: string) {
  const myId = useAuthStore((state) => state.user?.id);
  // the state is stored with its issue id, so it resets by itself when we open another issue
  const [state, setState] = useState<PresenceState>({ issueId, users: [], actions: {} });

  useEffect(() => {
    if (!issueId) return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const clearAction = (userId: string) => {
      const timer = timers.get(userId);
      if (timer) clearTimeout(timer);
      timers.delete(userId);
      setState((prev) => {
        if (prev.issueId !== issueId || !(userId in prev.actions)) return prev;
        const { [userId]: _stopped, ...rest } = prev.actions;
        return { ...prev, actions: rest };
      });
    };

    const setAction = (userId: string, kind: PresenceActionKind) => {
      const old = timers.get(userId);
      if (old) clearTimeout(old);
      // if no new message comes, the hint ends by itself
      timers.set(
        userId,
        setTimeout(() => clearAction(userId), HINT_LIFETIME_MS),
      );
      setState((prev) => ({
        issueId,
        users: prev.issueId === issueId ? prev.users : [],
        actions: { ...(prev.issueId === issueId ? prev.actions : {}), [userId]: kind },
      }));
    };

    const stopListening = socketClient.subscribe((message) => {
      const payload = message.payload ?? {};
      if (payload.issueId !== issueId) return;

      if (message.type === 'PRESENCE_STATE' && Array.isArray(payload.users)) {
        setState({ issueId, users: payload.users.filter(isPresenceUser), actions: {} });
      } else if (message.type === 'PRESENCE_JOINED' && isPresenceUser(payload.user)) {
        const user = payload.user;
        setState((prev) => {
          const same = prev.issueId === issueId;
          const users = same ? prev.users : [];
          return {
            issueId,
            users: users.some((u) => u.id === user.id) ? users : [...users, user],
            actions: same ? prev.actions : {},
          };
        });
      } else if (message.type === 'PRESENCE_LEFT' && typeof payload.userId === 'string') {
        const userId = payload.userId;
        setState((prev) => ({
          issueId,
          users: (prev.issueId === issueId ? prev.users : []).filter((u) => u.id !== userId),
          actions: prev.issueId === issueId ? prev.actions : {},
        }));
        clearAction(userId);
      } else if (message.type === 'PRESENCE_ACTION' && typeof payload.userId === 'string') {
        const kind = payload.kind;
        if (kind === null) clearAction(payload.userId);
        else if (typeof kind === 'string' && KINDS.includes(kind as PresenceActionKind)) {
          setAction(payload.userId, kind as PresenceActionKind);
        }
      }
    });

    return () => {
      stopListening();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [issueId]);

  const current = state.issueId === issueId ? state : null;
  // you know you are here, so your own avatar is left out
  const users = (current?.users ?? []).filter((user) => user.id !== myId);
  // a hint needs a name, so it only shows for people in the list
  const hints: IPresenceHint[] = users.flatMap((user) => {
    const kind = current?.actions[user.id];
    return kind ? [{ user, kind }] : [];
  });

  return { users, hints };
}
