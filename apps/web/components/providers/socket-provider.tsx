'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { notificationKeys } from '../../hooks/use-notifications';
import { userKeys } from '../../hooks/use-user';
import { socketClient } from '../../lib/socket-client';

// Opens the socket while a user is signed in, and turns server messages into refreshes.
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const hasConnectedBefore = useRef(false);

  useEffect(() => {
    // the same two keys every notification action already refreshes
    const refreshNotifications = () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.counts });
    };

    const stopListening = socketClient.subscribe((message) => {
      // dev only: shows the real event names in the browser console
      if (process.env.NODE_ENV === 'development') console.debug('[ws]', message.type);

      if (message.type.startsWith('NOTIFICATION')) refreshNotifications();

      if (message.type === 'CONNECTED') {
        // after a reconnect, anything sent while we were offline was missed
        if (hasConnectedBefore.current) refreshNotifications();
        hasConnectedBefore.current = true;
      }
    });

    socketClient.connect();

    return () => {
      stopListening();
      socketClient.disconnect();
    };
  }, [qc]);

  return <>{children}</>;
}
