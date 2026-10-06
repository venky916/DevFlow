'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Zap } from 'lucide-react';

import { useUIStore } from '../../stores/ui.store';
import { SidebarContent } from './sidebar-content';

export function MobileSidebar() {
  const router = useRouter();

  const mobileDrawerOpen = useUIStore((state) => state.mobileDrawerOpen);

  const closeMobileDrawer = useUIStore((state) => state.closeMobileDrawer);

  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileDrawer();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileDrawerOpen, closeMobileDrawer]);

  return (
    <div className="min-[1025px]:hidden">
      {/* Overlay */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={closeMobileDrawer} />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border-default bg-bg-sidebar transition-transform duration-200 ease-out ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'} `}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-default pr-2">
          <button
            onClick={() => {
              closeMobileDrawer();
              router.push('/workspaces');
            }}
            className="flex h-[38px] items-center gap-2 px-4"
          >
            <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-accent">
              <Zap className="h-3 w-3 text-bg-app" />
            </div>

            <span className="text-[13px] font-semibold tracking-tight text-text-primary">
              DevFlow
            </span>
          </button>

          <button
            onClick={closeMobileDrawer}
            className="p-1 text-text-muted hover:text-text-primary"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SidebarContent onNavigate={closeMobileDrawer} />
        </div>
      </aside>
    </div>
  );
}
