'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation';

import { ROUTES } from '../constants/routes';
import { canProject, canWorkspace } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';
import { usePermissions } from './use-permissions';
import { useProjectBySlug, useProjects } from './use-projects';
import { useSidebarCounts } from './use-user';
import { useWorkspaceBySlug } from './use-workspaces';

export type SidebarState = ReturnType<typeof useSidebar>;

// Everything the sidebar reads, in one place.
// The workspace and project come from the guards' cached calls, so they cost no request.
export function useSidebar() {
    const params = useParams<{ workspaceSlug?: string; projectSlug?: string }>();
    const workspaceSlug = params.workspaceSlug ?? '';
    const projectSlug = params.projectSlug ?? '';
    const isOnProject = !!projectSlug;

    const pathname = usePathname();
    const from = useSearchParams().get('from');
    const onIssuePage = pathname.includes('/issues/');
    const openedFrom = (origin: string) => onIssuePage && from === origin;

    const user = useAuthStore((s) => s.user);
    const { data: counts } = useSidebarCounts();
    const { data: workspace } = useWorkspaceBySlug(workspaceSlug);
    const { data: currentProject } = useProjectBySlug(workspaceSlug, projectSlug);
    // the project list is shown on workspace pages only; inside a project it loads when the switcher opens
    const { data: projects } = useProjects(workspace?.id ?? '', { enabled: !isOnProject });
    const { workspaceRole, access } = usePermissions();

    const can = {
        viewWorkspaceAnalytics: canWorkspace(workspaceRole, 'VIEW_WORKSPACE_ANALYTICS'),
        updateWorkspace: canWorkspace(workspaceRole, 'UPDATE_WORKSPACE'),
        createSprint: canProject(access, 'CREATE_SPRINT'),
        viewProjectAnalytics: canProject(access, 'VIEW_PROJECT_ANALYTICS'),
        updateProject: canProject(access, 'UPDATE_PROJECT'),
    };

    const active = {
        inbox: pathname === ROUTES.inbox,
        myIssues: pathname === ROUTES.myIssues || openedFrom('my-issues'),
        workspaceAnalytics: pathname === ROUTES.workspaceAnalytics(workspaceSlug),
        workspaceSettings: pathname.startsWith(ROUTES.workspaceSettings(workspaceSlug)),
        projectOverview: pathname === ROUTES.project(workspaceSlug, projectSlug),
        board: pathname === ROUTES.projectBoard(workspaceSlug, projectSlug) || openedFrom('board'),
        backlog:
            pathname === ROUTES.projectBacklog(workspaceSlug, projectSlug) || openedFrom('backlog'),
        sprints: pathname === ROUTES.projectSprints(workspaceSlug, projectSlug),
        projectAnalytics: pathname === ROUTES.projectAnalytics(workspaceSlug, projectSlug),
        projectSettings: pathname.startsWith(ROUTES.projectSettings(workspaceSlug, projectSlug)),
    };

    return {
        workspaceSlug,
        projectSlug,
        isOnProject,
        user,
        counts,
        workspace,
        currentProject,
        projects,
        can,
        active,
    };
}