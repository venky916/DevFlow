"use client";

import { Bell, CheckCheck, Trash2 } from "lucide-react";

import type { INotification } from "@devflow/types";
import { Button } from "@devflow/ui/components/button";

import {
  useClearReadNotifications,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "../../hooks/use-notifications";
import { useSidebarCounts } from "../../hooks/use-user";
import {PageError} from "../shared/page-error";
import {PageLoading} from "../shared/page-loading";
import { NotificationRow } from "./notification-row";

interface NotificationGroupProps {
  label: string;
  notifications: INotification[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationGroup({
  label,
  notifications,
  onRead,
  onDelete,
}: NotificationGroupProps) {
  if (notifications.length === 0) return null;

  return (
    <>
      <div className="border-b border-border-default bg-bg-app px-5 py-2">
        <p className="font-mono text-2xs tracking-wider text-text-muted uppercase">
          {label}
        </p>
      </div>
      {notifications.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          onRead={onRead}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function InboxEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
      <div className="flex size-10 items-center justify-center rounded-full border border-border-default bg-bg-surface">
        <Bell className="size-5 text-text-muted" />
      </div>
      <p className="text-body text-text-muted">You're all caught up</p>
    </div>
  );
}

export function InboxPage() {
  const feed = useNotifications();
  const { data: counts } = useSidebarCounts();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: markingAll } = useMarkAllAsRead();
  const { mutate: clearRead, isPending: clearing } =
    useClearReadNotifications();
  const { mutate: deleteNotification } = useDeleteNotification();

  if (feed.isLoading) return <PageLoading />;
  if (feed.isError) {
    return (
      <PageError
        message="Couldn't load your notifications"
        onRetry={() => feed.refetch()}
      />
    );
  }

  const unread = feed.notifications.filter((n) => !n.isRead);
  const read = feed.notifications.filter((n) => n.isRead);
  // one source for the unread number: the same cache the sidebar badge uses
  const unreadCount = counts?.unreadNotifications ?? unread.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-default px-5">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-text-primary">Inbox</span>
          {unreadCount > 0 && (
            <span className="rounded-sm bg-accent px-1.5 py-0.5 font-mono text-2xs text-bg-app">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              loading={markingAll}
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="mr-1.5 size-3.5" />
              Mark all read
            </Button>
          )}
          {read.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              loading={clearing}
              onClick={() => clearRead()}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {feed.notifications.length === 0 ? (
        <InboxEmpty />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <NotificationGroup
            label="Unread"
            notifications={unread}
            onRead={markAsRead}
            onDelete={deleteNotification}
          />
          <NotificationGroup
            label="Read"
            notifications={read}
            onRead={markAsRead}
            onDelete={deleteNotification}
          />
          {feed.hasMore && (
            <div className="flex justify-center py-3">
              <Button
                variant="ghost"
                size="sm"
                loading={feed.isLoadingMore}
                onClick={feed.loadMore}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
