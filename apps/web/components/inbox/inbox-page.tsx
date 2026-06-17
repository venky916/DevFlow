"use client";

import { useRouter, useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCheck,
  Trash2,
  Bell,
  GitBranch,
  MessageSquare,
  UserPlus,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@devflow/ui/lib/cn";
import { Spinner } from "@devflow/ui/components/spinner";
import { Button } from "@devflow/ui/components/button";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useClearReadNotifications,
  useDeleteNotification,
} from "../../hooks/use-notifications";
import type { NotificationType, INotification } from "@devflow/types";

// ─── Notification icon by type ────────────────────────────────────
function NotifIcon({ type }: { type: NotificationType }) {
  const cls = "h-[15px] w-[15px] shrink-0";
  switch (type) {
    case "ISSUE_ASSIGNED":
      return <GitBranch className={cn(cls, "text-info-text")} />;
    case "ISSUE_COMMENTED":
      return <MessageSquare className={cn(cls, "text-accent")} />;
    case "SPRINT_STARTED":
      return <Zap className={cn(cls, "text-warning-text")} />;
    case "SPRINT_COMPLETED":
      return <Zap className={cn(cls, "text-success-text")} />;
    case "WORKSPACE_INVITED":
      return <UserPlus className={cn(cls, "text-accent")} />;
    case "PROJECT_ADDED":
      return <UserPlus className={cn(cls, "text-info-text")} />;
    default:
      return <Bell className={cn(cls, "text-text-muted")} />;
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
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  function handleClick() {
    if (!notif.isRead) onRead(notif.id);
    if (notif.link) router.push(notif.link);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-start gap-3 px-5 py-3.5 border-b border-border-default transition-colors cursor-pointer",
        notif.isRead ? "opacity-50 hover:opacity-70" : "hover:bg-bg-hover",
      )}
    >
      {/* Unread dot */}
      <div className="flex items-center justify-center w-[8px] pt-1 shrink-0">
        {!notif.isRead && (
          <div className="h-[6px] w-[6px] rounded-full bg-accent shrink-0" />
        )}
      </div>

      {/* Icon */}
      <div className="pt-0.5 shrink-0">
        <NotifIcon type={notif.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] leading-snug",
            notif.isRead ? "text-text-muted" : "text-text-primary",
          )}
        >
          {notif.content}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5 font-mono">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Delete button — visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger-text transition-all shrink-0 mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 pb-16">
      <div className="h-10 w-10 rounded-full bg-bg-surface border border-border-default flex items-center justify-center">
        <Bell className="h-5 w-5 text-text-muted" />
      </div>
      <p className="text-[13px] text-text-muted">You're all caught up</p>
    </div>
  );
}

// ─── Main inbox page ──────────────────────────────────────────────
export function InboxPage() {
  const { data, isLoading } = useNotifications();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead, isPending: markingAll } = useMarkAllAsRead();
  const { mutate: clearRead, isPending: clearing } =
    useClearReadNotifications();
  const { mutate: deleteNotif } = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const hasRead = notifications.some((n) => n.isRead);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-[38px] border-b border-border-default shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-text-primary">
            Inbox
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-mono bg-accent text-bg-app px-1.5 py-0.5 rounded-[3px]">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={markingAll}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
          {hasRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearRead()}
              disabled={clearing}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyInbox />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Unread section */}
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <>
              <div className="px-5 py-2 bg-bg-app border-b border-border-default">
                <p className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-mono">
                  Unread
                </p>
              </div>
              {notifications
                .filter((n) => !n.isRead)
                .map((n) => (
                  <NotifRow
                    key={n.id}
                    notif={n}
                    onRead={(id) => markAsRead(id)}
                    onDelete={(id) => deleteNotif(id)}
                  />
                ))}
            </>
          )}

          {/* Read section */}
          {notifications.filter((n) => n.isRead).length > 0 && (
            <>
              <div className="px-5 py-2 bg-bg-app border-b border-border-default">
                <p className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-mono">
                  Read
                </p>
              </div>
              {notifications
                .filter((n) => n.isRead)
                .map((n) => (
                  <NotifRow
                    key={n.id}
                    notif={n}
                    onRead={(id) => markAsRead(id)}
                    onDelete={(id) => deleteNotif(id)}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
