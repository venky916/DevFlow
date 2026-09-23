"use client";

import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
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
import { useState } from "react";
import { cn } from "@devflow/ui/lib/cn";
import { Avatar } from "@devflow/ui/components/avatar";
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
import { canProject, canWorkspace } from "../../lib/permissions";
import { useSignOut } from "../../hooks/auth/use-sign-out";
import { useSidebarCounts } from "../../hooks/use-user";

function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
        <span
          className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            href === "/inbox"
              ? "text-accent bg-accent-subtle"
              : "text-text-muted bg-bg-hover",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-mono px-2 pt-2 pb-1">
      {label}
    </p>
  );
}

function SidebarDivider() {
  return <div className="h-px bg-border-default mx-2 my-1.5" />;
}

function WorkspaceSwitcher({
  currentWorkspace,
  workspaces,
  activeWorkspaceSlug,
  fallbackLabel,
  onNavigate,
}: {
  currentWorkspace?: {
    id: string;
    name: string;
    slug: string;
  };
  workspaces?: {
    id: string;
    name: string;
    slug: string;
  }[];
  activeWorkspaceSlug: string;
  fallbackLabel: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative px-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
      >
        <div className="h-[18px] w-[18px] rounded-[4px] bg-accent-subtle flex items-center justify-center shrink-0">
          <span className="text-accent text-[10px] font-bold font-mono">
            {currentWorkspace?.name?.[0]?.toUpperCase() ?? "D"}
          </span>
        </div>

        <span className="text-[12px] font-medium text-text-secondary flex-1 text-left truncate">
          {currentWorkspace?.name ?? fallbackLabel}
        </span>

        <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
      </button>

      <DropdownMenu open={open} onClose={() => setOpen(false)}>
        <DropdownLabel label="Workspaces" />

        {workspaces?.map((ws) => (
          <button
            key={ws.id}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
              router.push(`/${ws.slug}`);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <div className="h-[16px] w-[16px] rounded-[3px] bg-accent-subtle flex items-center justify-center shrink-0">
              <span className="text-accent text-[9px] font-bold font-mono">
                {ws.name?.[0]?.toUpperCase()}
              </span>
            </div>

            <span className="flex-1 text-left truncate">{ws.name}</span>

            {ws.slug === activeWorkspaceSlug && (
              <Check className="h-3 w-3 text-accent shrink-0" />
            )}
          </button>
        ))}

        <DropdownDivider />

        <DropdownItem
          onClick={() => {
            setOpen(false);
            onNavigate?.();
            router.push("/workspaces");
          }}
          icon={Plus}
          label="New workspace"
        />
      </DropdownMenu>
    </div>
  );
}

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from");

  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug?: string;
    projectSlug?: string;
  }>();

  const user = useAuthStore((s) => s.user);

  const { data: counts } = useSidebarCounts();
  const signOut = useSignOut();

  const { data: workspaces } = useWorkspaces();

  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  const { data: projects } = useProjects(currentWorkspace?.id ?? "");

  const currentProject = projects?.find(
    (project) => project.slug === projectSlug,
  );

  const { workspaceRole, access } = usePermissions();

  const [projDropOpen, setProjDropOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const onIssueDetailRoute = pathname.includes("/issues/");
  const onProjectRoute = !!projectSlug;

  return (
    <>
      {/* ─────────────────────────────────────────────
          Top navigation
      ───────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2 pt-1">
        <SidebarItem
          href="/inbox"
          icon={Inbox}
          label="Inbox"
          active={pathname === "/inbox"}
          badge={counts?.unreadNotifications}
          onClick={onNavigate}
        />

        <SidebarItem
          href="/my-issues"
          icon={CircleDot}
          label="My Issues"
          active={
            pathname === "/my-issues" ||
            (onIssueDetailRoute && from === "my-issues")
          }
          badge={counts?.myOpenIssues}
          onClick={onNavigate}
        />
      </nav>

      {workspaceSlug && (
        <>
          <SidebarDivider />

          {/* ═════════════════════════════════════════════
              STATE 1 — Workspace level
          ═════════════════════════════════════════════ */}
          {!onProjectRoute && (
            <>
              <WorkspaceSwitcher
                currentWorkspace={currentWorkspace}
                workspaces={workspaces}
                activeWorkspaceSlug={workspaceSlug}
                fallbackLabel="Select workspace"
                onNavigate={onNavigate}
              />

              <SidebarDivider />

              <div className="px-2">
                <SectionLabel label="Projects" />

                <nav className="flex flex-col gap-0.5">
                  {projects?.map((project) => (
                    <Link
                      key={project.id}
                      href={`/${workspaceSlug}/${project.slug}/board`}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 px-2 py-[5px] rounded-[4px] text-[13px] transition-colors",
                        "text-text-muted hover:bg-bg-hover hover:text-text-primary",
                      )}
                    >
                      <div className="h-[7px] w-[7px] rounded-full bg-accent shrink-0" />

                      <span className="flex-1 truncate">{project.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Workspace admin section */}
              {(canWorkspace(workspaceRole, "VIEW_WORKSPACE_ANALYTICS") ||
                canWorkspace(workspaceRole, "UPDATE_WORKSPACE")) && (
                <>
                  <SidebarDivider />

                  <div className="px-2">
                    <SectionLabel label="Workspace" />

                    <nav className="flex flex-col gap-0.5">
                      {canWorkspace(
                        workspaceRole,
                        "VIEW_WORKSPACE_ANALYTICS",
                      ) && (
                        <SidebarItem
                          href={`/${workspaceSlug}/analytics`}
                          icon={BarChart2}
                          label="Analytics"
                          active={pathname.endsWith("/analytics")}
                          onClick={onNavigate}
                        />
                      )}

                      {canWorkspace(workspaceRole, "UPDATE_WORKSPACE") && (
                        <SidebarItem
                          href={`/${workspaceSlug}/settings`}
                          icon={Settings}
                          label="Settings"
                          active={pathname.startsWith(
                            `/${workspaceSlug}/settings`,
                          )}
                          onClick={onNavigate}
                        />
                      )}
                    </nav>
                  </div>
                </>
              )}
            </>
          )}

          {/* ═════════════════════════════════════════════
              STATE 2 — Project level
          ═════════════════════════════════════════════ */}
          {onProjectRoute && (
            <>
              <WorkspaceSwitcher
                currentWorkspace={currentWorkspace}
                workspaces={workspaces}
                activeWorkspaceSlug={workspaceSlug}
                fallbackLabel="Workspace"
                onNavigate={onNavigate}
              />

              <SidebarDivider />

              {/* Project switcher */}
              <div className="relative px-2">
                <button
                  onClick={() => setProjDropOpen((v) => !v)}
                  className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
                >
                  <div className="h-[7px] w-[7px] rounded-full bg-accent shrink-0 ml-1" />

                  <span className="text-[12px] font-medium text-text-secondary flex-1 text-left truncate">
                    {currentProject?.name ?? projectSlug}
                  </span>

                  {(projects?.length ?? 0) > 1 && (
                    <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
                  )}
                </button>

                {(projects?.length ?? 0) > 1 && (
                  <DropdownMenu
                    open={projDropOpen}
                    onClose={() => setProjDropOpen(false)}
                  >
                    <DropdownLabel label="Projects" />

                    {projects?.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setProjDropOpen(false);
                          onNavigate?.();

                          router.push(
                            `/${workspaceSlug}/${project.slug}/board`,
                          );
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                      >
                        <div className="h-[6px] w-[6px] rounded-full bg-accent shrink-0" />

                        <span className="flex-1 text-left truncate">
                          {project.name}
                        </span>

                        {project.slug === projectSlug && (
                          <Check className="h-3 w-3 text-accent shrink-0" />
                        )}
                      </button>
                    ))}
                  </DropdownMenu>
                )}
              </div>

              {/* Project navigation */}
              <div className="px-2">
                <SectionLabel label="Project" />

                <nav className="flex flex-col gap-0.5">
                  <SidebarItem
                    href={`/${workspaceSlug}/${projectSlug}`}
                    icon={LayoutGrid}
                    label="Overview"
                    active={pathname === `/${workspaceSlug}/${projectSlug}`}
                    onClick={onNavigate}
                  />

                  <SidebarItem
                    href={`/${workspaceSlug}/${projectSlug}/board`}
                    icon={Columns3}
                    label="Board"
                    active={
                      pathname.endsWith("/board") ||
                      (onIssueDetailRoute && from === "board")
                    }
                    onClick={onNavigate}
                  />

                  <SidebarItem
                    href={`/${workspaceSlug}/${projectSlug}/backlog`}
                    icon={List}
                    label="Backlog"
                    active={
                      pathname.endsWith("/backlog") ||
                      (onIssueDetailRoute && from === "backlog")
                    }
                    onClick={onNavigate}
                  />

                  {canProject(access, "CREATE_SPRINT") && (
                    <SidebarItem
                      href={`/${workspaceSlug}/${projectSlug}/sprints`}
                      icon={Zap}
                      label="Sprints"
                      active={pathname.endsWith("/sprints")}
                      onClick={onNavigate}
                    />
                  )}

                  {canProject(access, "VIEW_PROJECT_ANALYTICS") && (
                    <SidebarItem
                      href={`/${workspaceSlug}/${projectSlug}/analytics`}
                      icon={BarChart2}
                      label="Analytics"
                      active={pathname.endsWith("/analytics")}
                      onClick={onNavigate}
                    />
                  )}

                  {canProject(access, "UPDATE_PROJECT") && (
                    <SidebarItem
                      href={`/${workspaceSlug}/${projectSlug}/settings`}
                      icon={Settings}
                      label="Project settings"
                      active={pathname.includes(`/${projectSlug}/settings`)}
                      onClick={onNavigate}
                    />
                  )}
                </nav>
              </div>
            </>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────
          Profile
      ───────────────────────────────────────────── */}
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
              onNavigate?.();
              router.push("/profile");
            }}
            icon={User}
            label="Profile"
          />

          <DropdownDivider />

          <DropdownItem
            onClick={() => {
              setProfileMenuOpen(false);
              onNavigate?.();
              router.push("/workspaces");
            }}
            icon={LayoutGrid}
            label="My Workspaces"
          />

          <DropdownDivider />

          <DropdownItem
            onClick={signOut}
            icon={LogOut}
            label="Sign out"
            danger
          />
        </DropdownMenu>
      </div>
    </>
  );
}
