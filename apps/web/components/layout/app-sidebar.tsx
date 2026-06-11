"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  CircleDot,
  Settings,
  Columns3,
  List,
  Zap,
  ChevronDown,
  Check,
  Plus,
  MoreHorizontal,
  LogOut,
  User,
  BarChart2,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@devflow/ui/lib/cn";
import { Avatar } from "@devflow/ui/components/avatar";
import { Spinner } from "@devflow/ui/components/spinner";
import {
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  DropdownLabel,
} from "@devflow/ui/components/dropdown";
import { useAuthStore } from "../../stores/auth.store";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { usePermissions } from "../../hooks/use-permissions";
import { auth } from "../../lib/firebase";

// ─── Sidebar nav item ──────────────────────────────────────────────────────────
function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-2 py-[5px] rounded-[4px] text-[13px] transition-colors",
        active
          ? "bg-bg-active text-text-primary"
          : "text-text-muted hover:bg-bg-hover hover:text-text-primary",
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[10px] font-medium text-text-muted bg-bg-hover px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-mono px-2 pt-2 pb-1">
      {label}
    </p>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────
function SidebarDivider() {
  return <div className="h-px bg-border-default mx-2 my-1.5" />;
}

// ─── Main sidebar ──────────────────────────────────────────────────────────────
export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug?: string;
    projectSlug?: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // ── Remember last workspace/project context in localStorage ──
  // This keeps the sidebar stable when navigating to /inbox or /my-issues
  // which have no workspaceSlug/projectSlug in the URL
  const [cachedWorkspaceSlug, setCachedWorkspaceSlug] = useState<string>("");
  const [cachedProjectSlug, setCachedProjectSlug] = useState<string>("");

  useEffect(() => {
    if (workspaceSlug) {
      setCachedWorkspaceSlug(workspaceSlug);
      localStorage.setItem("lastWorkspaceSlug", workspaceSlug);
    } else {
      // On /inbox or /my-issues, restore from localStorage
      const saved = localStorage.getItem("lastWorkspaceSlug");
      if (saved) setCachedWorkspaceSlug(saved);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (projectSlug) {
      setCachedProjectSlug(projectSlug);
      localStorage.setItem("lastProjectSlug", projectSlug);
    } else if (!workspaceSlug) {
      // Only restore project context on global routes (/inbox, /my-issues)
      // NOT on workspace routes (e.g. /techcorp) — those should show workspace view
      const saved = localStorage.getItem("lastProjectSlug");
      if (saved) setCachedProjectSlug(saved);
    } else {
      // We're on a workspace route but no project — clear cached project
      setCachedProjectSlug("");
    }
  }, [projectSlug, workspaceSlug]);

  // Use real slug if available, otherwise fall back to cached
  const activeWorkspaceSlug = workspaceSlug ?? cachedWorkspaceSlug;
  const activeProjectSlug = projectSlug ?? cachedProjectSlug;

  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const currentWorkspace = workspaces?.find(
    (ws) => ws.slug === activeWorkspaceSlug,
  );

  const { data: projects, isLoading: projLoading } = useProjects(
    currentWorkspace?.id ?? "",
  );
  const currentProject = projects?.find((p) => p.slug === activeProjectSlug);

  const {
    isOwnerOrAdmin,
    isLeadOrAbove,
    canViewBacklog,
    canManageSprints,
    canViewProjectSettings,
    isLoading: permLoading,
  } = usePermissions();

  const [wsDropOpen, setWsDropOpen] = useState(false);
  const [projDropOpen, setProjDropOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ── Route context flags ───────────────────────────────────────
  // onProjectRoute: true when we're on a project page OR came from one (cached)
  const onProjectRoute = !!(
    projectSlug ??
    (cachedProjectSlug && !workspaceSlug)
  );

  // Projects visible to this user
  // Owner/Admin see all; Lead/Dev/Viewer see only their assigned ones
  const visibleProjects = isOwnerOrAdmin
    ? projects
    : projects?.filter((p) => p.members?.some((m) => m.userId === user?.id));

  async function handleSignOut() {
    await auth.signOut();
    clearAuth();
    localStorage.removeItem("lastWorkspaceSlug");
    localStorage.removeItem("lastProjectSlug");
    router.push("/sign-in");
  }

  if (wsLoading || projLoading || permLoading) {
    return (
      <aside className="w-[200px] min-w-[200px] h-full bg-bg-sidebar border-r border-border-default flex items-center justify-center shrink-0">
        <Spinner size="sm" />
      </aside>
    );
  }

  return (
    <aside className="w-[200px] min-w-[200px] h-full bg-bg-sidebar border-r border-border-default flex flex-col shrink-0">
      {/* ── DevFlow brand — always static ──────────────────────── */}
      <div className="flex items-center gap-2 px-4 h-[38px] border-b border-border-default shrink-0">
        <div className="h-[20px] w-[20px] rounded-[4px] bg-accent flex items-center justify-center shrink-0">
          <Zap className="h-3 w-3 text-bg-app" />
        </div>
        <span className="text-[13px] font-semibold text-text-primary tracking-tight">
          DevFlow
        </span>
      </div>

      {/* ── Global nav — always visible ────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2 pt-1">
        <SidebarItem
          href="/inbox"
          icon={Inbox}
          label="Inbox"
          active={pathname === "/inbox"}
          badge={3} // TODO: real unread count
        />
        <SidebarItem
          href="/my-issues"
          icon={CircleDot}
          label="My Issues"
          active={pathname === "/my-issues"}
          badge={5} // TODO: real count
        />
      </nav>

      {/* Only show workspace/project sections if we have a workspace context */}
      {activeWorkspaceSlug && (
        <>
          <SidebarDivider />

          {/* ══════════════════════════════════════════════════════
              WORKSPACE VIEW
              Shown when: no project context at all
              Who sees it: Owner/Admin only (Lead/Dev get redirected)
          ══════════════════════════════════════════════════════ */}
          {!onProjectRoute && isOwnerOrAdmin && (
            <>
              {/* Workspace switcher */}
              <div className="relative px-2">
                <button
                  onClick={() => setWsDropOpen((v) => !v)}
                  className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
                >
                  <div className="h-[18px] w-[18px] rounded-[4px] bg-accent-subtle flex items-center justify-center shrink-0">
                    <span className="text-accent text-[10px] font-bold font-mono">
                      {currentWorkspace?.name?.[0]?.toUpperCase() ?? "D"}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-text-secondary flex-1 text-left truncate">
                    {currentWorkspace?.name ?? "Select workspace"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
                </button>

                <DropdownMenu
                  open={wsDropOpen}
                  onClose={() => setWsDropOpen(false)}
                >
                  <DropdownLabel label="Workspaces" />
                  {workspaces?.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setWsDropOpen(false);
                        router.push(`/${ws.slug}`);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      <div className="h-[16px] w-[16px] rounded-[3px] bg-accent-subtle flex items-center justify-center shrink-0">
                        <span className="text-accent text-[9px] font-bold font-mono">
                          {ws.name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="flex-1 text-left truncate">
                        {ws.name}
                      </span>
                      {ws.slug === activeWorkspaceSlug && (
                        <Check className="h-3 w-3 text-accent shrink-0" />
                      )}
                    </button>
                  ))}
                  <DropdownDivider />
                  <DropdownItem
                    onClick={() => {
                      setWsDropOpen(false);
                      router.push("/workspaces");
                    }}
                    icon={Plus}
                    label="New workspace"
                  />
                </DropdownMenu>
              </div>

              <SidebarDivider />

              {/* Projects list — Owner/Admin see all */}
              <div className="px-2">
                <SectionLabel label="Projects" />
                <nav className="flex flex-col gap-0.5">
                  {projects?.map((proj) => (
                    <Link
                      key={proj.id}
                      href={`/${activeWorkspaceSlug}/${proj.slug}/board`}
                      className={cn(
                        "flex items-center gap-2 px-2 py-[5px] rounded-[4px] text-[13px] transition-colors",
                        activeProjectSlug === proj.slug
                          ? "bg-bg-active text-text-primary"
                          : "text-text-muted hover:bg-bg-hover hover:text-text-primary",
                      )}
                    >
                      <div className="h-[7px] w-[7px] rounded-full bg-accent shrink-0" />
                      <span className="flex-1 truncate">{proj.name}</span>
                    </Link>
                  ))}
                  <button
                    onClick={() => router.push(`/${activeWorkspaceSlug}`)}
                    className="flex items-center gap-2 px-2 py-[5px] rounded-[4px] text-[13px] text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors w-full"
                  >
                    <Plus className="h-[14px] w-[14px] shrink-0" />
                    New project
                  </button>
                </nav>
              </div>

              <SidebarDivider />

              {/* Workspace section */}
              <div className="px-2">
                <SectionLabel label="Workspace" />
                <nav className="flex flex-col gap-0.5">
                  <SidebarItem
                    href={`/${activeWorkspaceSlug}/analytics`}
                    icon={BarChart2}
                    label="Analytics"
                    active={pathname.endsWith("/analytics")}
                  />
                  <SidebarItem
                    href={`/${activeWorkspaceSlug}/settings`}
                    icon={Settings}
                    label="Settings"
                    active={pathname.startsWith(
                      `/${activeWorkspaceSlug}/settings`,
                    )}
                  />
                </nav>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              PROJECT VIEW
              Shown when: inside a project route OR came from one
              Who sees it: everyone (Owner/Admin + Lead/Dev/Viewer)
          ══════════════════════════════════════════════════════ */}
          {onProjectRoute && (
            <>
              {/* Workspace switcher — Owner/Admin only, back nav to workspace */}
              {isOwnerOrAdmin && (
                <div className="relative px-2">
                  <button
                    onClick={() => setWsDropOpen((v) => !v)}
                    className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
                  >
                    <div className="h-[18px] w-[18px] rounded-[4px] bg-accent-subtle flex items-center justify-center shrink-0">
                      <span className="text-accent text-[10px] font-bold font-mono">
                        {currentWorkspace?.name?.[0]?.toUpperCase() ?? "D"}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-text-secondary flex-1 text-left truncate">
                      {currentWorkspace?.name ?? "Workspace"}
                    </span>
                    <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
                  </button>

                  <DropdownMenu
                    open={wsDropOpen}
                    onClose={() => setWsDropOpen(false)}
                  >
                    <DropdownLabel label="Workspaces" />
                    {workspaces?.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setWsDropOpen(false);
                          router.push(`/${ws.slug}`);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                      >
                        <div className="h-[16px] w-[16px] rounded-[3px] bg-accent-subtle flex items-center justify-center shrink-0">
                          <span className="text-accent text-[9px] font-bold font-mono">
                            {ws.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span className="flex-1 text-left truncate">
                          {ws.name}
                        </span>
                        {ws.slug === activeWorkspaceSlug && (
                          <Check className="h-3 w-3 text-accent shrink-0" />
                        )}
                      </button>
                    ))}
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() => {
                        setWsDropOpen(false);
                        router.push("/workspaces");
                      }}
                      icon={Plus}
                      label="New workspace"
                    />
                  </DropdownMenu>
                </div>
              )}

              {isOwnerOrAdmin && <SidebarDivider />}

              {/* Project switcher — everyone sees this */}
              <div className="relative px-2">
                <button
                  onClick={() => setProjDropOpen((v) => !v)}
                  className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
                >
                  <div className="h-[7px] w-[7px] rounded-full bg-accent shrink-0 ml-1" />
                  <span className="text-[12px] font-medium text-text-secondary flex-1 text-left truncate">
                    {currentProject?.name ?? activeProjectSlug}
                  </span>
                  {(visibleProjects?.length ?? 0) > 1 && (
                    <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
                  )}
                </button>

                {(visibleProjects?.length ?? 0) > 1 && (
                  <DropdownMenu
                    open={projDropOpen}
                    onClose={() => setProjDropOpen(false)}
                  >
                    <DropdownLabel label="Projects" />
                    {visibleProjects?.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setProjDropOpen(false);
                          router.push(
                            `/${activeWorkspaceSlug}/${proj.slug}/board`,
                          );
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                      >
                        <div className="h-[6px] w-[6px] rounded-full bg-accent shrink-0" />
                        <span className="flex-1 text-left truncate">
                          {proj.name}
                        </span>
                        {proj.slug === activeProjectSlug && (
                          <Check className="h-3 w-3 text-accent shrink-0" />
                        )}
                      </button>
                    ))}
                  </DropdownMenu>
                )}
              </div>

              {/* Project nav — role-based visibility */}
              <div className="px-2">
                <SectionLabel label="Project" />
                <nav className="flex flex-col gap-0.5">
                  <SidebarItem
                    href={`/${activeWorkspaceSlug}/${activeProjectSlug}`}
                    icon={LayoutGrid}
                    label="Overview"
                    active={
                      pathname ===
                      `/${activeWorkspaceSlug}/${activeProjectSlug}`
                    }
                  />
                  <SidebarItem
                    href={`/${activeWorkspaceSlug}/${activeProjectSlug}/board`}
                    icon={Columns3}
                    label="Board"
                    active={pathname.endsWith("/board")}
                  />
                  {/* Backlog — Lead and above only */}
                  {canViewBacklog && (
                    <SidebarItem
                      href={`/${activeWorkspaceSlug}/${activeProjectSlug}/backlog`}
                      icon={List}
                      label="Backlog"
                      active={pathname.endsWith("/backlog")}
                    />
                  )}
                  {/* Sprints — Lead and above only */}
                  {canManageSprints && (
                    <SidebarItem
                      href={`/${activeWorkspaceSlug}/${activeProjectSlug}/sprints`}
                      icon={Zap}
                      label="Sprints"
                      active={pathname.endsWith("/sprints")}
                    />
                  )}
                  <SidebarItem
                    href={`/${activeWorkspaceSlug}/${activeProjectSlug}/analytics`}
                    icon={BarChart2}
                    label="Analytics"
                    active={pathname.endsWith("/analytics")}
                  />
                  {/* Project settings — Lead and above only */}
                  {canViewProjectSettings && (
                    <SidebarItem
                      href={`/${activeWorkspaceSlug}/${activeProjectSlug}/settings`}
                      icon={Settings}
                      label="Project settings"
                      active={pathname.includes(
                        `/${activeProjectSlug}/settings`,
                      )}
                    />
                  )}
                </nav>
              </div>

              {/* Workspace settings — Owner/Admin only */}
              {isOwnerOrAdmin && (
                <>
                  <SidebarDivider />
                  <div className="px-2">
                    <SectionLabel label="Workspace" />
                    <nav className="flex flex-col gap-0.5">
                      <SidebarItem
                        href={`/${activeWorkspaceSlug}/settings`}
                        icon={Settings}
                        label="Settings"
                        active={pathname.startsWith(
                          `/${activeWorkspaceSlug}/settings`,
                        )}
                      />
                    </nav>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── Profile bottom — always visible ───────────────────── */}
      <div className="mt-auto relative">
        <SidebarDivider />
        <button
          onClick={() => setProfileMenuOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-bg-hover transition-colors"
        >
          <Avatar name={user?.name ?? user?.email ?? "U"} size="sm" />
          <span className="text-[12px] text-text-secondary flex-1 text-left truncate">
            {user?.name ?? user?.email ?? "Account"}
          </span>
          <MoreHorizontal className="h-3.5 w-3.5 text-text-muted shrink-0" />
        </button>

        <DropdownMenu
          open={profileMenuOpen}
          onClose={() => setProfileMenuOpen(false)}
          anchor="top"
        >
          <DropdownItem
            onClick={() => {
              setProfileMenuOpen(false);
              router.push(`/${activeWorkspaceSlug}/profile`);
            }}
            icon={User}
            label="Profile"
          />
          <DropdownDivider />
          <DropdownItem
            onClick={handleSignOut}
            icon={LogOut}
            label="Sign out"
            danger
          />
        </DropdownMenu>
      </div>
    </aside>
  );
}
