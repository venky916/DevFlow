import { captureError, logger, subscriber } from '@devflow/backend-common';

import { roomManager } from '../RoomManager';

subscriber.on('message', (channel, message) => {
  try {
    const event = JSON.parse(message);
    // one line per card move, comment and activity, so it stays at debug
    logger.debug({ channel, type: event.type }, 'Redis event received');
    roomManager.broadcast(channel, event);
  } catch (err) {
    logger.error({ err, channel }, 'Could not handle a Redis event');
    captureError(err, { channel });
  }
});

const subscribeTo = (channel: string) => {
  subscriber.subscribe(channel, (err) => {
    if (err) {
      logger.error({ err, channel }, 'Failed to subscribe to Redis channel');
      return;
    }
    logger.debug({ channel }, 'Subscribed to Redis channel');
  });
};

// only unsubscribe from Redis when nobody is in the room any more
const unsubscribeIfEmpty = (channel: string) => {
  const roomSize = roomManager.getRoomSize(channel);
  if (roomSize > 0) {
    logger.debug({ channel, roomSize }, 'Room still has clients, keeping the Redis subscription');
    return;
  }

  subscriber.unsubscribe(channel, (err) => {
    if (err) {
      logger.error({ err, channel }, 'Failed to unsubscribe from Redis channel');
      return;
    }
    logger.debug({ channel }, 'Unsubscribed from Redis channel');
  });
};

export const subscribeToProjectChannel = (projectId: string) => subscribeTo(`project:${projectId}`);

export const unsubscribeFromProjectChannel = (projectId: string) =>
  unsubscribeIfEmpty(`project:${projectId}`);

export const subscribeToIssueChannel = (issueId: string) => subscribeTo(`issue:${issueId}`);

export const unsubscribeFromIssueChannel = (issueId: string) =>
  unsubscribeIfEmpty(`issue:${issueId}`);
