import Link from 'next/link';

import { ROUTES } from '../../constants/routes';
import { Logo } from '../shared/logo';
import { SidebarContent } from './sidebar-content';

export function DesktopSidebar() {
  return (
    <aside className="hidden h-full w-50 min-w-50 shrink-0 flex-col border-r border-border-default bg-bg-sidebar min-[1025px]:flex">
      <div className="flex shrink-0 items-center border-b border-border-default">
        <Link href={ROUTES.workspaces} className="flex h-9.5 items-center px-4">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SidebarContent />
      </div>
    </aside>
  );
}
