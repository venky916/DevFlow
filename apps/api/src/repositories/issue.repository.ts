// repositories/issue.repository.ts
import { prisma } from '@devflow/db';
import { IIssue, IssueStatus } from '@devflow/types';
import { generateKeyBetween } from 'fractional-indexing';

type CreateIssueData = Pick<IIssue, 'title' | 'priority' | 'type' | 'status'> &
    Partial<Pick<IIssue, 'description' | 'dueDate' | 'parentId' | 'assigneeId' | 'sprintId'>>;

type CreateSubIssueData = Pick<IIssue, 'title' | 'priority' | 'type'> &
    Partial<Pick<IIssue, 'description' | 'dueDate' | 'assigneeId'>>;


export const issueInclude = {
    assignee: { select: { id: true, name: true, avatarUrl: true } },
    creator: { select: { id: true, name: true, avatarUrl: true } },
    labels: { include: { label: true } },
};

export const issueRepository = {
    findById(issueId: string) {
        return prisma.issue.findUnique({ where: { id: issueId } });
    },

    findByIdWithInclude(issueId: string) {
        return prisma.issue.findUnique({ where: { id: issueId }, include: issueInclude });
    },

    findProjectMember(projectId: string, userId: string) {
        return prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
    },

    findAssigneeContact(userId: string) {
        return prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    },

    async getNextPosition(projectId: string, sprintId: string | null, parentId?: string) {
        const lastIssue = parentId
            ? await prisma.issue.findFirst({ where: { parentId }, orderBy: { position: 'desc' } })
            : await prisma.issue.findFirst({ where: { projectId, sprintId }, orderBy: { position: 'desc' } });
        return generateKeyBetween(lastIssue?.position ?? null, null);
    },

    findSprint(sprintId: string) {
        return prisma.sprint.findUnique({ where: { id: sprintId } });
    },

    async createIssue(projectId: string, creatorId: string, data: CreateIssueData, position: string, labelIds?: string[], attachments?: any[]) {
        return prisma.$transaction(async (tx) => {
            const created = await tx.issue.create({
                data: { ...data, position, projectId, creatorId },
            });

            if (labelIds?.length) {
                await tx.issueLabel.createMany({
                    data: labelIds.map((labelId) => ({ issueId: created.id, labelId })),
                });
            }
            if (attachments?.length) {
                await tx.attachment.createMany({
                    data: attachments.map((a) => ({ ...a, issueId: created.id, uploadedBy: creatorId })),
                });
            }
            return tx.issue.findUnique({ where: { id: created.id }, include: issueInclude });
        });
    },

    async updateIssue(issueId: string, data: Record<string, any>, labelIds?: string[]) {
        return prisma.$transaction(async (tx) => {
            const result = await tx.issue.update({ where: { id: issueId }, data });

            if (labelIds !== undefined) {
                await tx.issueLabel.deleteMany({ where: { issueId } });
                if (labelIds.length > 0) {
                    await tx.issueLabel.createMany({ data: labelIds.map((labelId) => ({ issueId, labelId })) });
                }
            }
            if (data.status && result.parentId) {
                await this.syncParentStatus(result.parentId, tx);
            }
            return tx.issue.findUnique({ where: { id: issueId }, include: issueInclude });
        });
    },

    async moveIssue(issueId: string, status: IssueStatus, position: string) {
        return prisma.$transaction(async (tx) => {
            const result = await tx.issue.update({ where: { id: issueId }, data: { status, position } });
            if (result.parentId) await this.syncParentStatus(result.parentId, tx);
            return result;
        });
    },

    async moveToSprint(issueId: string, sprintId: string | null, newStatus: IssueStatus, position: string | undefined, targetSprintStatus: string | undefined) {
        return prisma.$transaction(async (tx) => {
            await tx.issue.update({
                where: { id: issueId },
                data: { sprintId, status: newStatus, ...(position && { position }) },
            });

            const children = await tx.issue.findMany({ where: { parentId: issueId }, select: { id: true, status: true } });
            for (const child of children) {
                const childStatus =
                    targetSprintStatus === 'ACTIVE' && child.status === 'BACKLOG' ? 'TODO' : child.status;
                await tx.issue.update({ where: { id: child.id }, data: { sprintId, status: childStatus } });
            }
        });
    },

    async createSubIssue(parentId: string, projectId: string, sprintId: string | null, creatorId: string, data: CreateSubIssueData, status: IssueStatus, position: string, labelIds?: string[]) {
        return prisma.$transaction(async (tx) => {
            const created = await tx.issue.create({
                data: { ...data, status, position, parentId, projectId, sprintId, creatorId },
            });
            if (labelIds?.length) {
                await tx.issueLabel.createMany({ data: labelIds.map((labelId) => ({ issueId: created.id, labelId })) });
            }
            return tx.issue.findUnique({ where: { id: created.id }, include: issueInclude });
        });
    },

    countChildren(parentId: string) {
        return prisma.issue.count({ where: { parentId } });
    },

    async attachChild(parentId: string, childId: string, sprintId: string | null) {
        return prisma.$transaction(async (tx) => {
            await tx.issue.update({ where: { id: childId }, data: { parentId, sprintId } });
            await this.syncParentStatus(parentId, tx);
            return tx.issue.findUnique({ where: { id: childId }, include: issueInclude });
        });
    },

    async detachChild(parentId: string, childId: string) {
        return prisma.$transaction(async (tx) => {
            const result = await tx.issue.update({ where: { id: childId }, data: { parentId: null } });
            await this.syncParentStatus(parentId, tx);
            return result;
        });
    },

    delete(issueId: string) {
        return prisma.issue.delete({ where: { id: issueId } });
    },

    // syncs parent status when a child's status changes — mixed statuses leave parent as-is
    async syncParentStatus(parentId: string, tx: any) {
        const children = await tx.issue.findMany({ where: { parentId }, select: { status: true } });
        if (children.length === 0) return;

        const statuses: IssueStatus[] = children.map((c: { status: IssueStatus }) => c.status);
        const allSame = statuses.every((s) => s === statuses[0]);
        if (allSame) {
            await tx.issue.update({ where: { id: parentId }, data: { status: statuses[0] } });
        }
    },
};