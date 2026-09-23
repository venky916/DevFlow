"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useUpdateIssue, useProjectSprints, useProjectMembers } from "./use-issues"
import { useCanMoveIssue } from "./use-can-move-issue"
import { usePermissions } from "./use-permissions"
import { useAuthStore } from "../stores/auth.store"
import { updateIssueSchema, type UpdateIssueInput, type UpdateIssueOutput } from "@devflow/validators"
import type { IIssueWithRelations } from "@devflow/types"

export function useIssueForm(issue: IIssueWithRelations, projectId: string, onSaving: (saving: boolean) => void, projectContext?: { workspaceSlug: string; projectSlug: string }) {

    const { mutateAsync } = useUpdateIssue(issue.id, projectId);
    const { data: sprints } = useProjectSprints(projectId);
    const { data: members } = useProjectMembers(projectId);
    const { access } = usePermissions(projectContext);
    const userId = useAuthStore((s) => s.user?.id);
    const { canMove, canMoveToSprint, canEditDueDate } = useCanMoveIssue(projectContext);


    const form = useForm<UpdateIssueInput, any, UpdateIssueOutput>({
        resolver: zodResolver(updateIssueSchema), defaultValues: {
            title: issue.title,
            description: issue.description ?? "",
            priority: issue.priority,
            type: issue.type,
            status: issue.status,
            assigneeId: issue.assigneeId ?? undefined,
            dueDate: issue.dueDate ? issue.dueDate.toString() : null,
            sprintId: issue.sprintId ?? undefined,
            labelIds: issue.labels?.map((l: any) => l.labelId) ?? [],
        }
    });

    useEffect(() => {
        form.reset({
            title: issue.title,
            description: issue.description ?? "",
            priority: issue.priority,
            type: issue.type,
            status: issue.status,
            assigneeId: issue.assigneeId ?? undefined,
            dueDate: issue.dueDate ? issue.dueDate.toString() : null,
            sprintId: issue.sprintId ?? undefined,
            labelIds: issue.labels?.map((l: any) => l.labelId) ?? [],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issue]);

    const save = async (data: UpdateIssueInput) => {
        try {
            onSaving(true);
            await mutateAsync(data);
        } catch {
            toast.error("Failed to update");
            form.reset(); // roll back to last good values on failure
        } finally {
            onSaving(false);
        }
    }

    // Lead/Admin: always true. Developer: only true if they're the assignee.
    const canEditIssue = canMove({ assigneeId: issue.assigneeId ?? null });
    const isDeveloper = !access.isWorkspaceAdmin && access.projectRole === "DEVELOPER";

    const sprintOptions = sprints?.map((s) => ({ label: s.name, value: s.id })) ?? [];

    const allMemberOptions =
        members?.map((m) => ({ label: m.user?.name ?? m.user?.email ?? "Unknown", value: m.userId })) ?? [];

    // Developer can only assign to themselves; Lead/Admin see the full member list.
    const memberOptions = isDeveloper
        ? allMemberOptions.filter((m) => m.value === userId)
        : allMemberOptions;

    // status becomes read-only once an issue has children — it's computed via syncParentStatus
    const hasChildren = (issue.children?.length ?? 0) > 0;
    const canUploadAttachment = canEditIssue;

    return { ...form, save, sprintOptions, memberOptions, hasChildren, canEditIssue, canMoveToSprint, canEditDueDate, canUploadAttachment };
}