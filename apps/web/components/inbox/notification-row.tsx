'use client';

import Link from 'next/link';
import {
  AtSign,
  Bell,
  GitBranch,
  MessageSquare,
  UserPlus,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { INotification, NotificationType } from '@devflow/types';
import { cn } from '@devflow/ui/lib/cn';

import { formatTimeAgo } from '../../lib/format-date';
import { getSafeRedirect } from '../../lib/redirect';

const NOTIFICATION_ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  ISSUE_ASSIGNED: { icon: GitBranch, className: 'text-info-text' },
  ISSUE_COMMENTED: { icon: MessageSquare, className: 'text-accent' },
  MENTION: { icon: AtSign, className: 'text-accent' },
  SPRINT_STARTED: { icon: Zap, className: 'text-warning-text' },
  SPRINT_COMPLETED: { icon: Zap, className: 'text-success-text' },
  WORKSPACE_INVITED: { icon: UserPlus, className: 'text-accent' },
  PROJECT_ADDED: { icon: UserPlus, className: 'text-info-text' },
  PASSWORD_RESET: { icon: Bell, className: 'text-text-muted' },
  OTHER: { icon: Bell, className: 'text-text-muted' },
};

interface NotificationRowProps {
  notification: INotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationRow({ notification, onRead, onDelete }: NotificationRowProps) {
  const { icon: Icon, className: iconClass } = NOTIFICATION_ICONS[notification.type];
  // the link was stored by the server, so only same-site paths are followed
  const href = getSafeRedirect(notification.link, '');

  const handleOpen = () => {
    if (!notification.isRead) onRead(notification.id);
  };

  const bodyClass = 'flex min-w-0 flex-1 items-start gap-3 px-5 py-3.5 text-left';
  const body = (
    <>
      <div className="flex w-2 shrink-0 items-center justify-center pt-1">
        {!notification.isRead && <div className="size-1.5 rounded-full bg-accent" />}
      </div>
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-body leading-snug',
            notification.isRead ? 'text-text-muted' : 'text-text-primary',
          )}
        >
          {notification.content}
        </p>
        <p className="mt-0.5 font-mono text-2xs text-text-muted">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'group flex items-start border-b border-border-default transition-colors',
        notification.isRead ? 'opacity-50 hover:opacity-70' : 'hover:bg-bg-hover',
      )}
    >
      {href ? (
        <Link href={href} onClick={handleOpen} className={bodyClass}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={handleOpen} className={bodyClass}>
          {body}
        </button>
      )}

      <button
        type="button"
        onClick={() => onDelete(notification.id)}
        className="mt-3.5 mr-5 shrink-0 text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-danger-text focus-visible:opacity-100"
        aria-label="Delete notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
