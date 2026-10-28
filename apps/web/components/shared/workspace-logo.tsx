import { cn } from '@devflow/ui/lib/cn';

const SIZES = {
  xs: { box: 'size-4 rounded-sm', letter: 'text-[9px] font-bold' }, // 16px, dropdown rows
  sm: { box: 'size-4.5 rounded-base', letter: 'text-[10px] font-bold' }, // 18px, sidebar
  md: { box: 'size-10 rounded-md', letter: 'text-lg font-semibold' }, // 40px, workspace list
} as const;

interface WorkspaceLogoProps {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZES;
}

export function WorkspaceLogo({ name, logoUrl, size = 'sm' }: WorkspaceLogoProps) {
  const { box, letter } = SIZES[size];

  // decorative: the workspace name is always shown next to it
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={cn(box, 'shrink-0 object-cover')} />;
  }

  return (
    <div className={cn(box, 'flex shrink-0 items-center justify-center bg-accent-subtle')}>
      <span className={cn('font-mono text-accent', letter)}>
        {(name.charAt(0) || 'D').toUpperCase()}
      </span>
    </div>
  );
}
