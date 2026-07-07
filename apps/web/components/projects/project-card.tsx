import { IProjectWithMembers } from "@devflow/types";
import { DEFAULT_PROJECT_COLOR } from "@devflow/ui/components/color-picker";
import { ColorSwatch } from "@devflow/ui/components/color-swatch";
import { FolderKanban, Users, Zap } from "lucide-react";

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
      className="flex flex-col gap-3 p-4 rounded-[4px] border border-border-default bg-bg-surface hover:border-border-emphasis hover:bg-bg-hover transition-colors text-left"
    >
      {/* Top */}
      <div className="flex items-start gap-2.5">
        <div
          className="h-8 w-8 rounded-[6px] shrink-0 mt-0.5"
          style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[13px] font-medium text-text-primary truncate">
            {project.name}
          </span>
          <span className="text-[11px] text-text-muted font-mono truncate">
            {project.slug}
          </span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[12px] text-text-muted line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 mt-auto pt-1">
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
