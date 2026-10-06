import { FolderKanban, Users, Zap } from 'lucide-react';

import { IProjectWithMembers } from '@devflow/types';
import { DEFAULT_PROJECT_COLOR } from '@devflow/ui/components/color-picker';
import { ColorSwatch } from '@devflow/ui/components/color-swatch';

export function ProjectCard({
  project,
  onClick,
}: {
  project: IProjectWithMembers;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-[4px] border border-border-default bg-bg-surface p-4 text-left transition-colors hover:border-border-emphasis hover:bg-bg-hover"
    >
      {/* Top */}
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 h-8 w-8 shrink-0 rounded-[6px]"
          style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-text-primary">{project.name}</span>
          <span className="truncate font-mono text-[11px] text-text-muted">{project.slug}</span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="line-clamp-2 text-[12px] text-text-muted">{project.description}</p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <FolderKanban className="h-3 w-3" />
          {project._count?.issues ?? 0} issues
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Users className="h-3 w-3" />
          {project._count?.members ?? 0} members
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Zap className="h-3 w-3" />
          {project._count?.sprints ?? 0} sprints
        </div>
      </div>
    </button>
  );
}
