"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Plus } from "lucide-react";

import type { IWorkspaceSummary } from "@devflow/types";
import {
  DropdownDivider,
  DropdownLabel,
  DropdownMenu,
} from "@devflow/ui/components/dropdown";
import { Spinner } from "@devflow/ui/components/spinner";

import { ROUTES } from "../../constants/routes";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { WorkspaceLogo } from "../shared/workspace-logo";
import { MENU_LINK_CLASS } from "./sidebar-item";

interface WorkspaceSwitcherProps {
  workspace: IWorkspaceSummary | undefined;
  activeSlug: string;
  onNavigate?: () => void;
}

export function WorkspaceSwitcher({
  workspace,
  activeSlug,
  onNavigate,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  // the full list is only requested once the menu is opened
  const { data: workspaces, isLoading } = useWorkspaces({ enabled: open });

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-base px-2 py-1.25 transition-colors hover:bg-bg-hover"
      >
        <WorkspaceLogo
          name={workspace?.name ?? ""}
          logoUrl={workspace?.logoUrl ?? null}
        />
        <span className="flex-1 truncate text-left text-xs font-medium text-text-secondary">
          {workspace?.name ?? "Workspace"}
        </span>
        <ChevronDown className="size-3 shrink-0 text-text-muted" />
      </button>

      <DropdownMenu open={open} onClose={() => setOpen(false)}>
        <DropdownLabel label="Workspaces" />
        {isLoading && (
          <div className="flex justify-center py-3">
            <Spinner size="sm" />
          </div>
        )}
        {workspaces?.map((ws) => (
          <Link
            key={ws.id}
            href={ROUTES.workspace(ws.slug)}
            onClick={handleNavigate}
            className={MENU_LINK_CLASS}
          >
            <WorkspaceLogo name={ws.name} logoUrl={ws.logoUrl} size="xs" />
            <span className="flex-1 truncate text-left">{ws.name}</span>
            {ws.slug === activeSlug && (
              <Check className="size-3 shrink-0 text-accent" />
            )}
          </Link>
        ))}
        <DropdownDivider />
        <Link
          href={ROUTES.workspaces}
          onClick={handleNavigate}
          className={MENU_LINK_CLASS}
        >
          <Plus className="size-3.5 shrink-0" />
          New workspace
        </Link>
      </DropdownMenu>
    </div>
  );
}
