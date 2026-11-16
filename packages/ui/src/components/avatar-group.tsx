'use client';

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../lib/cn';
import { Avatar } from './avatar';

export interface AvatarGroupUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface AvatarGroupProps {
  users: AvatarGroupUser[];
  // how many avatars to show before "+N"
  max?: number;
  className?: string;
}

const OPEN_DELAY_MS = 100;
const CLOSE_DELAY_MS = 150;

export function AvatarGroup({ users, max = 3, className }: AvatarGroupProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const openLater = (next: boolean, delay: number) => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  useEffect(() => clearTimer, []);

  if (users.length === 0) return null;

  const visible = users.slice(0, max);
  const extra = users.length - visible.length;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        clearTimer();
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${users.length} ${users.length === 1 ? 'person is' : 'people are'} viewing this issue`}
          onMouseEnter={() => openLater(true, OPEN_DELAY_MS)}
          onMouseLeave={() => openLater(false, CLOSE_DELAY_MS)}
          className={cn('flex cursor-pointer items-center', className)}
        >
          {visible.map((user, index) => (
            <Avatar
              key={user.id}
              name={user.name}
              src={user.avatarUrl ?? undefined}
              size="sm"
              className={cn('ring-2 ring-bg-app', index > 0 && '-ml-1.5')}
            />
          ))}
          {extra > 0 && (
            <span className="-ml-1.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-bg-hover px-1 text-[10px] font-medium text-text-secondary ring-2 ring-bg-app">
              +{extra}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          // do not move focus into the list: someone may be typing in the comment box
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onMouseEnter={clearTimer}
          onMouseLeave={() => openLater(false, CLOSE_DELAY_MS)}
          className="z-50 min-w-48 rounded-base border border-border-emphasis bg-bg-surface p-2 shadow-lg"
        >
          <p className="px-2 pb-1 font-mono text-[11px] tracking-wide text-text-muted uppercase">
            Viewing now
          </p>
          <ul className="flex flex-col">
            {users.map((user) => (
              <li key={user.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                <Avatar name={user.name} src={user.avatarUrl ?? undefined} size="sm" />
                <span className="truncate text-sm text-text-secondary">{user.name}</span>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
