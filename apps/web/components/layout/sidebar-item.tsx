import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@devflow/ui/lib/cn';

import { ProjectDot } from '../shared/project-dot';

const ROW_CLASS = 'flex items-center gap-2 rounded-base px-2 py-1.25 text-body transition-colors';
const IDLE_CLASS = 'text-text-muted hover:bg-bg-hover hover:text-text-primary';

// rows inside the switcher and user dropdowns
export const MENU_LINK_CLASS =
  'flex w-full items-center gap-2 px-3 py-1.5 text-body text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary';

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  badgeTone?: 'accent' | 'muted';
  onClick?: () => void;
}

export function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  badgeTone = 'muted',
  onClick,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(ROW_CLASS, active ? 'bg-bg-active text-text-primary' : IDLE_CLASS)}
    >
      <Icon className="size-3.75 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            badgeTone === 'accent' ? 'bg-accent-subtle text-accent' : 'bg-bg-hover text-text-muted',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

interface SidebarProjectLinkProps {
  href: string;
  name: string;
  color: string | null;
  onClick?: () => void;
}

export function SidebarProjectLink({ href, name, color, onClick }: SidebarProjectLinkProps) {
  return (
    <Link href={href} onClick={onClick} className={cn(ROW_CLASS, IDLE_CLASS)}>
      <ProjectDot color={color} />
      <span className="flex-1 truncate">{name}</span>
    </Link>
  );
}

export function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-2 pt-2 pb-1 font-mono text-[10px] tracking-[0.06em] text-text-muted uppercase">
      {label}
    </p>
  );
}

export function SidebarDivider() {
  return <div className="mx-2 my-1.5 h-px bg-border-default" />;
}
