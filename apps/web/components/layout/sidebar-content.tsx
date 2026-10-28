'use client';

import {
  BarChart2,
  CircleDot,
  Columns3,
  Inbox,
  LayoutGrid,
  List,
  Settings,
  Zap,
} from 'lucide-react';

import { ROUTES } from '../../constants/routes';
import { useSidebar, type SidebarState } from '../../hooks/use-sidebar';
import { ProjectSwitcher } from './project-switcher';
import { SectionLabel, SidebarDivider, SidebarItem, SidebarProjectLink } from './sidebar-item';
import { UserMenu } from './user-menu';
import { WorkspaceSwitcher } from './workspace-switcher';

interface NavProps {
  sidebar: SidebarState;
  onNavigate?: () => void;
}

// Workspace level: project list + admin links
function WorkspaceNav({ sidebar, onNavigate }: NavProps) {
  const { workspaceSlug, projects, can, active } = sidebar;

  return (
    <>
      <div className="px-2">
        <SectionLabel label="Projects" />
        <nav className="flex flex-col gap-0.5">
          {projects?.map((project) => (
            <SidebarProjectLink
              key={project.id}
              href={ROUTES.projectBoard(workspaceSlug, project.slug)}
              name={project.name}
              color={project.color}
              onClick={onNavigate}
            />
          ))}
        </nav>
      </div>

      {(can.viewWorkspaceAnalytics || can.updateWorkspace) && (
        <>
          <SidebarDivider />
          <div className="px-2">
            <SectionLabel label="Workspace" />
            <nav className="flex flex-col gap-0.5">
              {can.viewWorkspaceAnalytics && (
                <SidebarItem
                  href={ROUTES.workspaceAnalytics(workspaceSlug)}
                  icon={BarChart2}
                  label="Analytics"
                  active={active.workspaceAnalytics}
                  onClick={onNavigate}
                />
              )}
              {can.updateWorkspace && (
                <SidebarItem
                  href={ROUTES.workspaceSettings(workspaceSlug)}
                  icon={Settings}
                  label="Settings"
                  active={active.workspaceSettings}
                  onClick={onNavigate}
                />
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

// Project level: project switcher + project links
function ProjectNav({ sidebar, onNavigate }: NavProps) {
  const { workspace, workspaceSlug, projectSlug, currentProject, can, active } = sidebar;

  return (
    <>
      <ProjectSwitcher
        project={currentProject}
        workspaceId={workspace?.id ?? ''}
        workspaceSlug={workspaceSlug}
        projectSlug={projectSlug}
        canSwitch={(workspace?._count.projects ?? 0) > 1}
        onNavigate={onNavigate}
      />

      <div className="px-2">
        <SectionLabel label="Project" />
        <nav className="flex flex-col gap-0.5">
          <SidebarItem
            href={ROUTES.project(workspaceSlug, projectSlug)}
            icon={LayoutGrid}
            label="Overview"
            active={active.projectOverview}
            onClick={onNavigate}
          />
          <SidebarItem
            href={ROUTES.projectBoard(workspaceSlug, projectSlug)}
            icon={Columns3}
            label="Board"
            active={active.board}
            onClick={onNavigate}
          />
          <SidebarItem
            href={ROUTES.projectBacklog(workspaceSlug, projectSlug)}
            icon={List}
            label="Backlog"
            active={active.backlog}
            onClick={onNavigate}
          />
          {can.createSprint && (
            <SidebarItem
              href={ROUTES.projectSprints(workspaceSlug, projectSlug)}
              icon={Zap}
              label="Sprints"
              active={active.sprints}
              onClick={onNavigate}
            />
          )}
          {can.viewProjectAnalytics && (
            <SidebarItem
              href={ROUTES.projectAnalytics(workspaceSlug, projectSlug)}
              icon={BarChart2}
              label="Analytics"
              active={active.projectAnalytics}
              onClick={onNavigate}
            />
          )}
          {can.updateProject && (
            <SidebarItem
              href={ROUTES.projectSettings(workspaceSlug, projectSlug)}
              icon={Settings}
              label="Project settings"
              active={active.projectSettings}
              onClick={onNavigate}
            />
          )}
        </nav>
      </div>
    </>
  );
}

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const sidebar = useSidebar();
  const { workspaceSlug, workspace, isOnProject, counts, active, user } = sidebar;

  return (
    <>
      <nav className="flex flex-col gap-0.5 px-2 pt-1">
        <SidebarItem
          href={ROUTES.inbox}
          icon={Inbox}
          label="Inbox"
          active={active.inbox}
          badge={counts?.unreadNotifications}
          badgeTone="accent"
          onClick={onNavigate}
        />
        <SidebarItem
          href={ROUTES.myIssues}
          icon={CircleDot}
          label="My Issues"
          active={active.myIssues}
          badge={counts?.myOpenIssues}
          onClick={onNavigate}
        />
      </nav>

      {workspaceSlug && (
        <>
          <SidebarDivider />
          <WorkspaceSwitcher
            workspace={workspace}
            activeSlug={workspaceSlug}
            onNavigate={onNavigate}
          />
          <SidebarDivider />
          {isOnProject ? (
            <ProjectNav sidebar={sidebar} onNavigate={onNavigate} />
          ) : (
            <WorkspaceNav sidebar={sidebar} onNavigate={onNavigate} />
          )}
        </>
      )}

      <UserMenu user={user} onNavigate={onNavigate} />
    </>
  );
}
