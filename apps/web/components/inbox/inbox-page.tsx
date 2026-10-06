'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  AtSign,
  Bell,
  CheckCheck,
  GitBranch,
  MessageSquare,
  Trash2,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';

import type { INotification, NotificationType } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { cn } from '@devflow/ui/lib/cn';

import {
  useClearReadNotifications,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from '../../hooks/use-notifications';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';

// ─── Notification icon by type ────────────────────────────────────
function NotifIcon({ type }: { type: NotificationType }) {
  const cls = 'h-[15px] w-[15px] shrink-0';
  switch (type) {
    case 'ISSUE_ASSIGNED':
      return <GitBranch className={cn(cls, 'text-info-text')} />;
    case 'ISSUE_COMMENTED':
      return <MessageSquare className={cn(cls, 'text-accent')} />;
    case 'MENTION':
      return <AtSign className={cn(cls, 'text-accent')} />;
    case 'SPRINT_STARTED':
      return <Zap className={cn(cls, 'text-warning-text')} />;
    case 'SPRINT_COMPLETED':
      return <Zap className={cn(cls, 'text-success-text')} />;
    case 'WORKSPACE_INVITED':
      return <UserPlus className={cn(cls, 'text-accent')} />;
    case 'PROJECT_ADDED':
      return <UserPlus className={cn(cls, 'text-info-text')} />;
    default:
      return <Bell className={cn(cls, 'text-text-muted')} />;
  }
}

// ─── Single notification row ──────────────────────────────────────
function NotifRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: INotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  function handleClick() {
    if (!notif.isRead) onRead(notif.id);
    if (notif.link) router.push(notif.link);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex cursor-pointer items-start gap-3 border-b border-border-default px-5 py-3.5 transition-colors',
        notif.isRead ? 'opacity-50 hover:opacity-70' : 'hover:bg-bg-hover',
      )}
    >
      <div className="flex w-[8px] shrink-0 items-center justify-center pt-1">
        {!notif.isRead && <div className="h-[6px] w-[6px] shrink-0 rounded-full bg-accent" />}
      </div>

      <div className="shrink-0 pt-0.5">
        <NotifIcon type={notif.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[13px] leading-snug',
            notif.isRead ? 'text-text-muted' : 'text-text-primary',
          )}
        >
          {notif.content}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-text-muted">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        className="mt-0.5 shrink-0 text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-danger-text"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Grouped section (Unread / Read) ──────────────────────────────
function NotificationGroup({
  label,
  notifications,
  onRead,
  onDelete,
}: {
  label: string;
  notifications: INotification[];
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <>
      <div className="border-b border-border-default bg-bg-app px-5 py-2">
        <p className="font-mono text-[10px] tracking-[0.06em] text-text-muted uppercase">{label}</p>
      </div>
      {notifications.map((n) => (
        <NotifRow key={n.id} notif={n} onRead={onRead} onDelete={onDelete} />
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-surface">
        <Bell className="h-5 w-5 text-text-muted" />
      </div>
      <p className="text-[13px] text-text-muted">You're all caught up</p>
    </div>
  );
}

export function InboxPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: markingAll } = useMarkAllAsRead();
  const { mutate: clearRead, isPending: clearing } = useClearReadNotifications();
  const { mutate: deleteNotif } = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError) {
    return <PageError message="Couldn't load your notifications" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-border-default px-5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-text-primary">Inbox</span>
          {unreadCount > 0 && (
            <span className="rounded-[3px] bg-accent px-1.5 py-0.5 font-mono text-[10px] text-bg-app">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} disabled={markingAll}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
          {read.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearRead()} disabled={clearing}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <NotificationGroup
            label="Unread"
            notifications={unread}
            onRead={markAsRead}
            onDelete={deleteNotif}
          />
          <NotificationGroup
            label="Read"
            notifications={read}
            onRead={markAsRead}
            onDelete={deleteNotif}
          />
        </div>
      )}
    </div>
  );
}
