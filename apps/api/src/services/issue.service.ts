// services/issue.service.ts
import type { BoardStatus, IssueStatus } from '@devflow/types';
import type {
  CreateIssueOutput,
  CreateSubIssueOutput,
  UpdateIssueOutput,
} from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { isValidPosition, type IssueActor } from '../lib/issue-rules';
import { serializeIssue } from '../lib/issue-serializer';
import { buildUpdateData } from '../lib/updateBuilder';
import { issueRepository } from '../repositories/issue.repository';
import { activityService } from './activity.service';
import { issueEventsService } from './issue-events.service';
import { notificationService } from './notification.service';

type AttachmentInput = NonNullable<CreateIssueOutput['attachments']>;

async function assertProjectMember(projectId: string, userId: string) {
  const member = await issueRepository.findProjectMember(projectId, userId);
  if (!member) throw ApiError.badRequest('Assignee is not a member of this project');
}

async function assertLabelsInProject(projectId: string, labelIds: string[]) {
  const unique = [...new Set(labelIds)];
  if (unique.length === 0) return;
  const count = await issueRepository.countProjectLabels(projectId, unique);
  if (count !== unique.length) {
    throw ApiError.badRequest('One or more labels do not belong to this project');
  }
}

function assertAttachmentKeys(attachments: AttachmentInput) {
  if (attachments.some((a) => !a.fileKey.startsWith('attachments/'))) {
    throw ApiError.badRequest('Invalid attachment');
  }
}

// '' and null mean the same thing for an empty field, and dates compare as instants
const toComparable = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  return value === '' || value === undefined ? null : value;
};

// which of the sent fields really differ from what is stored
function diffFields(current: Record<string, unknown>, sent: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, next] of Object.entries(sent)) {
    if (next === undefined) continue; // not part of this request
    const from = toComparable(current[key]);
    const to = toComparable(next);
    if (from !== to) changes[key] = { from, to };
  }
  return changes;
}

export const issueService = {
  async createIssue(projectId: string, actor: IssueActor, input: CreateIssueOutput) {
    const {
      title,
      description,
      priority,
      type,
      assigneeId,
      sprintId,
      dueDate,
      labelIds,
      attachments,
    } = input;

    // developers may assign only themselves, and only leads set a due date
    if (!actor.isLead) {
      if (dueDate) throw ApiError.forbidden('Only leads or admins can set a due date');
      if (assigneeId && assigneeId !== actor.userId) {
        throw ApiError.forbidden('You can only assign issues to yourself');
      }
    }
    if (assigneeId) await assertProjectMember(projectId, assigneeId);

    // no sprint = Backlog. An issue in the active sprint starts as Todo (Backlog would be invisible on the board)
    let status: IssueStatus = 'BACKLOG';
    if (sprintId) {
      const sprint = await issueRepository.findSprint(sprintId);
      if (!sprint || sprint.projectId !== projectId) throw ApiError.notFound('Sprint not found');
      if (sprint.status === 'COMPLETED') {
        throw ApiError.badRequest('Cannot add issue to a completed sprint');
      }
      if (!actor.isLead && sprint.status !== 'ACTIVE') {
        throw ApiError.forbidden('Only leads or admins can add issues to a planned sprint');
      }
      if (sprint.status === 'ACTIVE') status = 'TODO';
    }

    await assertLabelsInProject(projectId, labelIds);
    if (attachments) assertAttachmentKeys(attachments);

    const position = await issueRepository.getNextPosition({
      projectId,
      sprintId: sprintId ?? null,
      parentId: null,
    });

    const created = await issueRepository.createIssue(
      projectId,
      actor.userId,
      {
        title,
        description,
        priority,
        type,
        status,
        dueDate: dueDate ?? null,
        assigneeId: assigneeId ?? null,
        sprintId: sprintId ?? null,
      },
      position,
      labelIds,
      attachments,
    );
    if (!created) throw ApiError.internal('Failed to create issue');
    const issue = serializeIssue(created);

    await issueEventsService.invalidateBoardCache(projectId, issue.sprintId ?? null);
    await activityService.logIssueCreated(issue.id, projectId, actor.userId, issue.title);
    if (assigneeId && assigneeId !== actor.userId) {
      await notificationService.notifyIssueAssigned(
        assigneeId,
        actor.userId,
        issue.id,
        title,
        projectId,
      );
    }
    await issueEventsService.publishCreated(projectId, issue);

    return issue;
  },

  async updateIssue(issueId: string, actor: IssueActor, input: UpdateIssueOutput) {
    const { title, description, priority, type, assigneeId, dueDate, labelIds } = input;

    const issue = await issueRepository.findByIdWithInclude(issueId);
    if (!issue) throw ApiError.notFound('Issue not found');

    // developers edit only issues assigned to them
    if (!actor.isLead && issue.assigneeId !== actor.userId) {
      throw ApiError.forbidden('You can only edit issues assigned to you');
    }

    // only fields that really changed are checked, so a form that re-sends every field still works
    const changes = diffFields(issue, { title, description, priority, type, assigneeId, dueDate });

    if (!actor.isLead && changes.dueDate) {
      throw ApiError.forbidden('Only leads or admins can change the due date');
    }
    if (changes.assigneeId && assigneeId) {
      if (!actor.isLead && assigneeId !== actor.userId) {
        throw ApiError.forbidden('You can only assign issues to yourself');
      }
      await assertProjectMember(issue.projectId, assigneeId);
    }

    const nextLabelIds = labelIds ? [...new Set(labelIds)].sort() : undefined;
    const currentLabelIds = issue.labels.map((l) => l.labelId).sort();
    const labelsChanged = !!nextLabelIds && nextLabelIds.join() !== currentLabelIds.join();
    if (labelsChanged) await assertLabelsInProject(issue.projectId, nextLabelIds);

    // nothing to save
    if (Object.keys(changes).length === 0 && !labelsChanged) return serializeIssue(issue);

    const only = <T>(key: string, value: T) => (changes[key] ? value : undefined);
    const updated = await issueRepository.updateIssue(
      issueId,
      buildUpdateData({
        title: only('title', title),
        description: only('description', description),
        priority: only('priority', priority),
        type: only('type', type),
        assigneeId: only('assigneeId', assigneeId),
        dueDate: only('dueDate', dueDate),
      }),
      labelsChanged ? nextLabelIds : undefined,
    );
    if (!updated) throw ApiError.internal('Failed to update issue');

    await issueEventsService.invalidateBoardCache(updated.projectId, updated.sprintId ?? null);

    if (Object.keys(changes).length > 0) {
      await activityService.logIssueUpdated(issueId, updated.projectId, actor.userId, changes);
    }
    if (changes.assigneeId && assigneeId && assigneeId !== actor.userId) {
      await notificationService.notifyIssueAssigned(
        assigneeId,
        actor.userId,
        issue.id,
        updated.title,
        updated.projectId,
      );
    }

    await issueEventsService.publishUpdated(
      issue.projectId,
      issueId,
      Object.fromEntries(Object.entries(changes).map(([key, change]) => [key, change.to])),
    );

    return serializeIssue(updated);
  },

  // moves a card inside the active sprint (drag, or the status field)
  async moveIssue(issueId: string, userId: string, status: BoardStatus, position?: string) {
    const issue = await issueRepository.findForMove(issueId);
    if (!issue) throw ApiError.notFound('Issue not found');

    if (issue._count.children > 0) {
      throw ApiError.badRequest('The status of an issue with sub-issues follows its sub-issues');
    }
    if (issue.sprint?.status !== 'ACTIVE') {
      throw ApiError.badRequest('Only issues in the active sprint can be moved');
    }
    if (position !== undefined && !isValidPosition(position)) {
      throw ApiError.badRequest('Invalid position');
    }

    // without a position (status field, list view) the card goes to the end of its column
    const newPosition =
      position ??
      (await issueRepository.getNextPosition({
        projectId: issue.projectId,
        sprintId: issue.sprintId,
        parentId: issue.parentId,
        status,
      }));

    const updated = await issueRepository.moveIssue(issueId, status, newPosition);

    if (issue.status !== status) {
      await activityService.logIssueStatusChanged(
        issueId,
        updated.projectId,
        userId,
        issue.status,
        status,
      );
    }
    await issueEventsService.publishMoved(updated.projectId, issueId, status, newPosition);
    await issueEventsService.invalidateBoardCache(updated.projectId, issue.sprintId);

    return updated;
  },

  async moveIssueToSprint(issueId: string, sprintId: string | null, position?: string) {
    const issue = await issueRepository.findById(issueId);
    if (!issue) throw ApiError.notFound('Issue not found');
    if (issue.parentId) throw ApiError.badRequest('Sub-issues move together with their parent');
    if (position !== undefined && !isValidPosition(position)) {
      throw ApiError.badRequest('Invalid position');
    }

    let targetSprintStatus: string | undefined;
    if (sprintId) {
      const targetSprint = await issueRepository.findSprint(sprintId);
      if (!targetSprint || targetSprint.projectId !== issue.projectId) {
        throw ApiError.notFound('Sprint not found');
      }
      if (targetSprint.status === 'COMPLETED') {
        throw ApiError.badRequest('Cannot move issue to completed sprint');
      }
      targetSprintStatus = targetSprint.status;
    }

    // Status only exists inside the active sprint: everywhere else an issue is Backlog.
    // Entering the active sprint from Backlog makes it Todo.
    const newStatus: IssueStatus =
      targetSprintStatus === 'ACTIVE'
        ? issue.status === 'BACKLOG'
          ? 'TODO'
          : issue.status
        : 'BACKLOG';

    const newPosition =
      position ??
      (await issueRepository.getNextPosition({
        projectId: issue.projectId,
        sprintId: sprintId ?? null,
        parentId: null,
      }));

    await issueRepository.moveToSprint(
      issueId,
      sprintId,
      newStatus,
      newPosition,
      targetSprintStatus,
    );

    await issueEventsService.invalidateBoardCaches(issue.projectId, [
      issue.sprintId ?? null,
      sprintId ?? null,
    ]);

    return { message: 'Issue moved to sprint successfully' };
  },

  // sub-issues are created from the parent's panel only (leads and admins, enforced by the route)
  async createSubIssue(parentId: string, actor: IssueActor, input: CreateSubIssueOutput) {
    const { title, description, priority, type, assigneeId, dueDate, labelIds } = input;

    const parent = await issueRepository.findById(parentId);
    if (!parent) throw ApiError.notFound('Parent issue not found');
    if (parent.parentId) throw ApiError.badRequest('Cannot nest more than 1 level deep');
    if (parent.status === 'DONE') {
      throw ApiError.badRequest('Cannot add sub-issue to completed issue');
    }

    if (assigneeId) await assertProjectMember(parent.projectId, assigneeId);
    await assertLabelsInProject(parent.projectId, labelIds);

    let initialStatus: IssueStatus = 'BACKLOG';
    if (parent.sprintId) {
      const parentSprint = await issueRepository.findSprint(parent.sprintId);
      if (parentSprint?.status === 'COMPLETED') {
        throw ApiError.badRequest('Cannot add sub-issue to completed sprint');
      }
      if (parentSprint?.status === 'ACTIVE') initialStatus = 'TODO';
    }

    const position = await issueRepository.getNextPosition({
      projectId: parent.projectId,
      sprintId: parent.sprintId,
      parentId,
    });

    const created = await issueRepository.createSubIssue(
      parentId,
      parent.projectId,
      parent.sprintId ?? null,
      actor.userId,
      {
        title,
        description,
        priority,
        type,
        dueDate: dueDate ?? null,
        assigneeId: assigneeId ?? null,
      },
      initialStatus,
      position,
      labelIds,
    );
    if (!created) throw ApiError.internal('Failed to create sub issue');
    const subIssue = serializeIssue(created);

    await issueEventsService.invalidateBoardCache(parent.projectId, parent.sprintId ?? null);
    await activityService.logIssueCreated(
      subIssue.id,
      parent.projectId,
      actor.userId,
      subIssue.title,
      parentId,
    );
    if (assigneeId && assigneeId !== actor.userId) {
      await notificationService.notifyIssueAssigned(
        assigneeId,
        actor.userId,
        subIssue.id,
        subIssue.title,
        subIssue.projectId,
      );
    }
    await issueEventsService.publishCreated(parent.projectId, subIssue);

    return subIssue;
  },

  async attachChildIssue(parentId: string, childId: string, userId: string) {
    if (childId === parentId) throw ApiError.badRequest('Issue cannot be its own parent');

    const parent = await issueRepository.findById(parentId);
    if (!parent) throw ApiError.notFound('Parent issue not found');
    if (parent.parentId) {
      throw ApiError.badRequest('Cannot nest more than 1 level deep in parent-child relationship');
    }

    const child = await issueRepository.findById(childId);
    if (!child) throw ApiError.notFound('Child issue to attach not found');
    if (child.projectId !== parent.projectId) {
      throw ApiError.badRequest('Issue must be in same project');
    }
    if (child.parentId) throw ApiError.badRequest('Issue already has a parent');

    const childHasChildren = await issueRepository.countChildren(childId);
    if (childHasChildren > 0) {
      throw ApiError.badRequest('Cannot attach — this issue already has its own sub-issues');
    }

    // the sub-issue joins the parent's sprint; in the active sprint a Backlog status becomes Todo
    const parentSprint = parent.sprintId ? await issueRepository.findSprint(parent.sprintId) : null;
    const childStatus: IssueStatus =
      parentSprint?.status === 'ACTIVE' && child.status === 'BACKLOG' ? 'TODO' : child.status;

    const updated = await issueRepository.attachChild(
      parentId,
      childId,
      parent.sprintId ?? null,
      childStatus,
    );

    await issueEventsService.invalidateBoardCaches(parent.projectId, [
      parent.sprintId ?? null,
      child.sprintId ?? null,
    ]);
    await activityService.logIssueUpdated(childId, parent.projectId, userId, {
      attachedToParent: parentId,
    });
    await issueEventsService.publishUpdated(parent.projectId, childId, { parentId });

    return updated ? serializeIssue(updated) : updated;
  },

  async detachChildIssue(parentId: string, childId: string, userId: string) {
    const child = await issueRepository.findById(childId);
    if (!child) throw ApiError.notFound('Child issue not found');
    if (child.parentId !== parentId) {
      throw ApiError.badRequest('Issue is not a child of this parent');
    }

    const updated = await issueRepository.detachChild(parentId, childId);

    await issueEventsService.invalidateBoardCache(child.projectId, child.sprintId ?? null);
    await activityService.logIssueUpdated(childId, child.projectId, userId, {
      detachedFromParent: parentId,
    });
    await issueEventsService.publishUpdated(child.projectId, childId, { parentId: null });

    return updated;
  },

  async deleteIssue(issueId: string, userId: string) {
    const issue = await issueRepository.findById(issueId);
    if (!issue) throw ApiError.notFound('Issue not found');

    const childCount = await issueRepository.countChildren(issueId);
    if (childCount > 0) {
      throw ApiError.badRequest('Delete all sub-issues before deleting this issue');
    }

    await issueRepository.delete(issueId); // also re-syncs the parent

    await issueEventsService.invalidateBoardCache(issue.projectId, issue.sprintId ?? null);
    await activityService.logIssueDeleted(issueId, issue.projectId, userId, issue.title);
    await issueEventsService.publishDeleted(issue.projectId, issueId);
  },
};
