"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useUpdateIssue, useProjectSprints, useProjectMembers } from "./use-issues"
import { updateIssueSchema, type UpdateIssueInput, type UpdateIssueOutput } from "@devflow/validators"
import type { IIssueWithRelations } from "@devflow/types"



export function useIssueForm(issue: IIssueWithRelations, projectId: string, onSaving: (saving: boolean) => void) {

    const { mutateAsync } = useUpdateIssue(issue.id, projectId);
    const { data: sprints } = useProjectSprints(projectId);
    const { data: members } = useProjectMembers(projectId);

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

    const sprintOptions = sprints?.map((s) => ({ label: s.name, value: s.id })) ?? [];
    const memberOptions =
        members?.map((m) => ({ label: m.user?.name ?? m.user?.email ?? "Unknown", value: m.userId })) ?? [];

    // status becomes read-only once an issue has children — it's computed via syncParentStatus
    const hasChildren = (issue.children?.length ?? 0) > 0;

    return { ...form, save, sprintOptions, memberOptions, hasChildren };
}