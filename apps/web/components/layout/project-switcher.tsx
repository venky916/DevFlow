"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

import type { IProjectSummary } from "@devflow/types";
import { DropdownLabel, DropdownMenu } from "@devflow/ui/components/dropdown";
import { Spinner } from "@devflow/ui/components/spinner";

import { ROUTES } from "../../constants/routes";
import { useProjects } from "../../hooks/use-projects";
import { ProjectDot } from "../shared/project-dot";
import { MENU_LINK_CLASS } from "./sidebar-item";

interface ProjectSwitcherProps {
  project: IProjectSummary | undefined;
  workspaceId: string;
  workspaceSlug: string;
  projectSlug: string;
  canSwitch: boolean; // the workspace has more than one project
  onNavigate?: () => void;
}

export function ProjectSwitcher({
  project,
  workspaceId,
  workspaceSlug,
  projectSlug,
  canSwitch,
  onNavigate,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  // the list is only requested once the menu is opened
  const { data: projects, isLoading } = useProjects(workspaceId, {
    enabled: open,
  });

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  const trigger = (
    <>
      <ProjectDot color={project?.color ?? null} className="ml-1" />
      <span className="flex-1 truncate text-left text-xs font-medium text-text-secondary">
        {project?.name ?? projectSlug}
      </span>
      {canSwitch && <ChevronDown className="size-3 shrink-0 text-text-muted" />}
    </>
  );

  return (
    <div className="relative px-2">
      {canSwitch ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-base px-2 py-1.25 transition-colors hover:bg-bg-hover"
        >
          {trigger}
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 rounded-base px-2 py-1.25">
          {trigger}
        </div>
      )}

      {canSwitch && (
        <DropdownMenu open={open} onClose={() => setOpen(false)}>
          <DropdownLabel label="Projects" />
          {isLoading && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
          {projects?.map((p) => (
            <Link
              key={p.id}
              href={ROUTES.projectBoard(workspaceSlug, p.slug)}
              onClick={handleNavigate}
              className={MENU_LINK_CLASS}
            >
              <ProjectDot color={p.color} size="sm" />
              <span className="flex-1 truncate text-left">{p.name}</span>
              {p.slug === projectSlug && (
                <Check className="size-3 shrink-0 text-accent" />
              )}
            </Link>
          ))}
        </DropdownMenu>
      )}
    </div>
  );
}
