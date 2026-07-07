"use client";

import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@devflow/ui/components/spinner";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { useProjects, useProjectById } from "../../../../hooks/use-projects";
import { useWorkspaces } from "../../../../hooks/use-workspaces";
import { useProjectActivities } from "../../../../hooks/use-projects";

export default function ProjectOverviewPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const { data: projects, isLoading: listLoading } = useProjects(
    currentWorkspace?.id ?? "",
  );
  const projectStub = projects?.find((p) => p.slug === projectSlug);

  const { data: project, isLoading: detailLoading } = useProjectById(
    projectStub?.id ?? "",
  );
  const { data: activities, isLoading: activitiesLoading } =
    useProjectActivities(projectStub?.id ?? "");

  if (listLoading || detailLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!project) return null;

  const activeSprint = project.sprints.find((s) => s.status === "ACTIVE");

  return (
    <div className="p-8 max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-[13px] text-text-muted">{project.description}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Issues", value: project._count.issues },
          { label: "Sprints", value: project._count.sprints },
          { label: "Members", value: project._count.members },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[6px] border border-border-default p-4"
          >
            <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono mb-2">
              {stat.label}
            </p>
            <p className="text-[24px] font-semibold text-text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          About
        </p>
        <div className="flex flex-col gap-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-text-muted">Description</span>
            <span className="text-text-primary text-right max-w-[60%]">
              {project.description ?? "No description"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted">Color</span>
            <span className="flex items-center gap-1.5 text-text-primary">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {project.color}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Created</span>
            <span className="text-text-primary">
              {formatDistanceToNow(new Date(project.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          Active Sprint
        </p>
        {activeSprint ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-text-primary">
                {activeSprint.name}
              </span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="h-1.5 w-full rounded-full bg-bg-surface overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{
                  width: `${activeSprint._count.issues > 0 ? (activeSprint.issues.length / activeSprint._count.issues) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-text-muted">
              {activeSprint.issues.length} / {activeSprint._count.issues} issues
              done
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-text-muted">No active sprint</p>
        )}
      </div>

      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          Members{" "}
          <span className="text-text-disabled">({project.members.length})</span>
        </p>
        <div className="flex flex-col gap-2">
          {project.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={m.user.name ?? m.user.email} size="sm" />
                <div className="flex flex-col">
                  <span className="text-[13px] text-text-primary">
                    {m.user.name ?? m.user.email}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {m.user.email}
                  </span>
                </div>
              </div>
              <Badge variant={m.role === "LEAD" ? "success" : "neutral"}>
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          Recent Activity
        </p>
        {activitiesLoading ? (
          <Spinner size="sm" />
        ) : !activities?.length ? (
          <p className="text-[13px] text-text-muted">No activity yet</p>
        ) : (
          <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <Avatar name={a.user?.name ?? "?"} size="sm" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-[12px] text-text-secondary">
                    <span className="text-text-primary font-medium">
                      {a.user?.name ?? "Someone"}
                    </span>{" "}
                    {a.action.toLowerCase().replace(/_/g, " ")}
                    {a.issue && (
                      <span className="text-text-muted">
                        {" "}
                        on {a.issue.title}
                      </span>
                    )}
                  </p>
                  <span className="text-[11px] text-text-muted">
                    {formatDistanceToNow(new Date(a.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
