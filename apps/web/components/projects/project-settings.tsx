"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs } from "@devflow/ui/components/tabs";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useProjectMembers } from "../../hooks/use-issues";
import { api } from "../../lib/axios";
import { useQueryClient } from "@tanstack/react-query";

export function ProjectSettings() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);
  const { data: members } = useProjectMembers(project?.id ?? "");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    values: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
  });

  const onSave = async (data: { name: string; description: string }) => {
    try {
      await api.patch(`/projects/${project?.id}`, data);
      qc.invalidateQueries({ queryKey: ["projects", workspace?.id] });
      toast.success("Project updated!");
    } catch {
      toast.error("Failed to update project");
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await api.delete(`/projects/${project?.id}`);
      toast.success("Project deleted");
      router.push(`/${workspaceSlug}`);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="flex flex-col w-full p-6 gap-6 max-w-[680px]">
      <h1 className="text-xl font-medium text-text-primary">
        Project Settings
      </h1>
      <div className="h-px bg-border-default" />

      <Tabs
        tabs={[
          {
            label: "General",
            value: "general",
            content: (
              <div className="flex flex-col gap-6">
                <form
                  onSubmit={handleSubmit(onSave)}
                  className="flex flex-col gap-4"
                >
                  <Input label="Project name" {...register("name")} />
                  <Input label="Description" {...register("description")} />
                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                </form>

                {/* Danger zone */}
                <div className="flex flex-col gap-3 p-4 rounded-[4px] border border-danger-text">
                  <p className="text-[13px] font-medium text-danger-text">
                    Danger Zone
                  </p>
                  <p className="text-[12px] text-text-muted">
                    Deleting this project will permanently remove all issues,
                    sprints, and data.
                  </p>
                  <div>
                    <Button variant="danger" size="sm" onClick={onDelete}>
                      Delete project
                    </Button>
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: "Members",
            value: "members",
            content: (
              <div className="flex flex-col gap-3">
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-[4px] border border-border-default"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.user?.name ?? member.user?.email ?? "?"}
                        size="sm"
                      />
                      <div>
                        <p className="text-[13px] text-text-primary">
                          {member.user?.name ?? "Unknown"}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {member.user?.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="neutral">{member.role}</Badge>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
