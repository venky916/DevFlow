"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  CircleDot,
  LayoutGrid,
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
} from "lucide-react";
import { useState } from "react";
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

// ─── Sidebar nav item ─────────────────────────────────────────────
function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
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
      {label}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-mono px-2 pt-2 pb-1">
      {label}
    </p>
  );
}

// ─── Divider ──────────────────────────────────────────────────────
function SidebarDivider() {
  return <div className="h-px bg-border-default mx-2 my-1.5" />;
}

// ─── Main sidebar ─────────────────────────────────────────────────
export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug?: string;
    projectSlug?: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  const { data: projects } = useProjects(currentWorkspace?.id ?? "");
  const currentProject = projects?.find((p) => p.slug === projectSlug);

  const {
    isOwnerOrAdmin,
    canViewBacklog,
    canManageSprints,
    canViewProjectSettings,
    isLoading: permLoading,
  } = usePermissions();

  const [wsDropOpen, setWsDropOpen] = useState(false);
  const [projDropOpen, setProjDropOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const onProjectRoute = !!projectSlug;

  async function handleSignOut() {
    await auth.signOut();
    clearAuth();
    router.push("/login");
  }

  if (wsLoading || permLoading) {
    return (
      <aside className="w-[200px] min-w-[200px] h-full bg-bg-sidebar border-r border-border-default flex items-center justify-center shrink-0">
        <Spinner size="sm" />
      </aside>
    );
  }

  return (
    <aside className="w-[200px] min-w-[200px] h-full bg-bg-sidebar border-r border-border-default flex flex-col shrink-0">
      {/* ── App brand ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 h-[38px] border-b border-border-default">
        <div className="h-[20px] w-[20px] rounded-[4px] bg-accent flex items-center justify-center shrink-0">
          <Zap className="h-3 w-3 text-bg-app" />
        </div>
        <span className="text-[13px] font-semibold text-text-primary tracking-tight">
          DevFlow
        </span>
      </div>

      {/* ── Workspace switcher ─────────────────────────────────── */}
      <div className="relative px-2 pt-2 pb-1">
        <button
          onClick={() => setWsDropOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
        >
          <div className="h-[20px] w-[20px] rounded-[4px] bg-accent-subtle flex items-center justify-center shrink-0">
            <span className="text-accent text-[10px] font-bold font-mono">
              {currentWorkspace?.name?.[0]?.toUpperCase() ?? "D"}
            </span>
          </div>
          <span className="text-[12px] font-medium text-text-primary flex-1 text-left truncate">
            {currentWorkspace?.name ?? "Select workspace"}
          </span>
          <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
        </button>

        <DropdownMenu open={wsDropOpen} onClose={() => setWsDropOpen(false)}>
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
                  {ws?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="flex-1 text-left truncate">{ws?.name}</span>
              {ws?.slug === workspaceSlug && (
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

      {/* ── Global nav ────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2 pt-1">
        <SidebarItem
          href={`/${workspaceSlug}/inbox`}
          icon={Inbox}
          label="Inbox"
          active={pathname === `/${workspaceSlug}/inbox`}
        />
        <SidebarItem
          href={`/${workspaceSlug}/my-issues`}
          icon={CircleDot}
          label="My Issues"
          active={pathname === `/${workspaceSlug}/my-issues`}
        />
      </nav>

      {/* ── Workspace section (Owner/Admin only) ──────────────── */}
      {isOwnerOrAdmin && (
        <>
          <SidebarDivider />
          <div className="px-2">
            <SectionLabel label="Workspace" />
            <nav className="flex flex-col gap-0.5">
              <SidebarItem
                href={`/${workspaceSlug}`}
                icon={LayoutGrid}
                label="Projects"
                active={pathname === `/${workspaceSlug}` && !onProjectRoute}
              />
              <SidebarItem
                href={`/${workspaceSlug}/settings`}
                icon={Settings}
                label="Settings"
                active={pathname.startsWith(`/${workspaceSlug}/settings`)}
              />
            </nav>
          </div>
        </>
      )}

      {/* ── Project section ───────────────────────────────────── */}
      {onProjectRoute && (
        <>
          <SidebarDivider />
          <div className="px-2">
            {/* Project switcher */}
            <div className="relative">
              <button
                onClick={() => setProjDropOpen((v) => !v)}
                className="flex items-center gap-2 w-full px-2 py-[5px] rounded-[4px] hover:bg-bg-hover transition-colors"
              >
                <div className="h-[8px] w-[8px] rounded-[2px] bg-info-text shrink-0" />
                <span className="text-[12px] font-medium text-text-secondary flex-1 text-left truncate">
                  {currentProject?.name ?? projectSlug}
                </span>
                <ChevronDown className="h-3 w-3 text-text-muted shrink-0" />
              </button>

              <DropdownMenu
                open={projDropOpen}
                onClose={() => setProjDropOpen(false)}
              >
                <DropdownLabel label="Projects" />
                {projects?.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setProjDropOpen(false);
                      router.push(`/${workspaceSlug}/${proj.slug}/board`);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                  >
                    <div className="h-[6px] w-[6px] rounded-[1px] bg-info-text shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {proj.name}
                    </span>
                    {proj.slug === projectSlug && (
                      <Check className="h-3 w-3 text-accent shrink-0" />
                    )}
                  </button>
                ))}
              </DropdownMenu>
            </div>

            <SectionLabel label="Project" />
            <nav className="flex flex-col gap-0.5">
              <SidebarItem
                href={`/${workspaceSlug}/${projectSlug}/board`}
                icon={Columns3}
                label="Board"
                active={pathname.endsWith("/board")}
              />
              {canViewBacklog && (
                <SidebarItem
                  href={`/${workspaceSlug}/${projectSlug}/backlog`}
                  icon={List}
                  label="Backlog"
                  active={pathname.endsWith("/backlog")}
                />
              )}
              {canManageSprints && (
                <SidebarItem
                  href={`/${workspaceSlug}/${projectSlug}/sprints`}
                  icon={Zap}
                  label="Sprints"
                  active={pathname.endsWith("/sprints")}
                />
              )}
              {canViewProjectSettings && (
                <SidebarItem
                  href={`/${workspaceSlug}/${projectSlug}/settings`}
                  icon={Settings}
                  label="Settings"
                  active={pathname.includes(`/${projectSlug}/settings`)}
                />
              )}
            </nav>
          </div>
        </>
      )}

      {/* ── Profile bottom ────────────────────────────────────── */}
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
              router.push("/profile");
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
