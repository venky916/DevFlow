'use client';

import type { IComment } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { CommentBox } from '@devflow/ui/components/comment-box';
import { CommentContent } from '@devflow/ui/components/comment-content';

import type { useMentionSuggestion } from '../../../hooks/use-mention-suggestion';
import { formatTimeAgo } from '../../../lib/format-date';

interface CommentItemProps {
  comment: IComment;
  canEdit: boolean;
  canDelete: boolean;
  isEditing: boolean;
  mentionSuggestion: ReturnType<typeof useMentionSuggestion>;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (json: object) => Promise<void>;
  onDelete: () => void;
}

export function CommentItem({
  comment,
  canEdit,
  canDelete,
  isEditing,
  mentionSuggestion,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: CommentItemProps) {
  // the two dates are written a few milliseconds apart on create, so a real edit is anything over a second
  const edited =
    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

  return (
    <div className="flex items-start gap-3">
      <Avatar
        name={comment.user.name ?? undefined}
        src={comment.user.avatarUrl ?? undefined}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-text-primary">
            {comment.user.name ?? 'Unknown'}
          </span>
          <span className="text-[11px] text-text-muted">
            {formatTimeAgo(comment.createdAt)}
            {edited && ' · edited'}
          </span>
        </div>

        {isEditing ? (
          <CommentBox
            initialContent={comment.content}
            placeholder="Edit comment..."
            mentionSuggestion={mentionSuggestion}
            submitLabel="Save"
            onSubmit={onSave}
            onCancel={onCancelEdit}
          />
        ) : (
          <CommentContent content={comment.content} />
        )}

        {!isEditing && (canEdit || canDelete) && (
          <div className="mt-0.5 flex gap-3">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="cursor-pointer text-[11px] text-text-muted transition-colors hover:text-text-primary"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer text-[11px] text-text-muted transition-colors hover:text-danger-text"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
