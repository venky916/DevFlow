'use client';

import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

import { SidebarContent } from './sidebar-content';

export function DesktopSidebar() {
  const router = useRouter();

  return (
    <aside className="hidden h-full w-[200px] min-w-[200px] shrink-0 flex-col border-r border-border-default bg-bg-sidebar min-[1025px]:flex">
      <div className="flex shrink-0 items-center border-b border-border-default">
        <button
          onClick={() => router.push('/workspaces')}
          className="flex h-[38px] items-center gap-2 px-4"
        >
          <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-accent">
            <Zap className="h-3 w-3 text-bg-app" />
          </div>

          <span className="text-[13px] font-semibold tracking-tight text-text-primary">
            DevFlow
          </span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SidebarContent />
      </div>
    </aside>
  );
}
