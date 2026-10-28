'use client';

import { useState } from 'react';

import type { IComment, ITiptapNode } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { CommentBox } from '@devflow/ui/components/comment-box';
import { ConfirmModal } from '@devflow/ui/components/confirm-modal';
import { Spinner } from '@devflow/ui/components/spinner';

import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../../../hooks/use-comments';
import { useIssueAccess } from '../../../hooks/use-issue-access';
import { useMentionSuggestion } from '../../../hooks/use-mention-suggestion';
import { CommentItem } from './comment-item';

interface CommentsSectionProps {
  issueId: string;
  projectId: string;
  projectContext: { workspaceSlug: string; projectSlug: string };
}

export function CommentsSection({ issueId, projectId, projectContext }: CommentsSectionProps) {
  const { data: comments, isLoading, isError, refetch } = useComments(issueId);
  const { mutateAsync: createComment } = useCreateComment(issueId);
  const { mutateAsync: updateComment } = useUpdateComment(issueId);
  const { mutate: deleteComment, isPending: deleting } = useDeleteComment(issueId);
  const { userId, isLead } = useIssueAccess(projectContext);
  const mentionSuggestion = useMentionSuggestion(projectId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<IComment | null>(null);

  // if posting fails, the hook shows the error and the editor keeps what was typed
  const handleCreate = async (json: object) => {
    await createComment({ content: json as ITiptapNode });
  };

  const handleSave = async (commentId: string, json: object) => {
    await updateComment({ commentId, content: json as ITiptapNode });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-medium text-text-primary">
        Comments
        {!!comments?.length && (
          <span className="ml-2 text-[12px] font-normal text-text-muted">{comments.length}</span>
        )}
      </p>

      {isLoading ? (
        <Spinner size="sm" />
      ) : isError || !comments ? (
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-text-muted">Couldn&apos;t load the comments.</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-[12px] text-text-disabled">No comments yet</p>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => {
            const isAuthor = comment.userId === userId;
            return (
              <CommentItem
                key={comment.id}
                comment={comment}
                canEdit={isAuthor} // only the author edits
                canDelete={isAuthor || isLead} // the author, a lead or an admin delete
                isEditing={editingId === comment.id}
                mentionSuggestion={mentionSuggestion}
                onEdit={() => setEditingId(comment.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(json) => handleSave(comment.id, json)}
                onDelete={() => setCommentToDelete(comment)}
              />
            );
          })}
        </div>
      )}

      <div className="border-t border-border-default pt-2">
        <CommentBox
          onSubmit={handleCreate}
          placeholder="Add a comment..."
          mentionSuggestion={mentionSuggestion}
        />
      </div>

      <ConfirmModal
        open={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={() => {
          if (commentToDelete) deleteComment(commentToDelete.id);
          setCommentToDelete(null);
        }}
        title="Delete comment?"
        description="This can't be undone."
        confirmLabel="Delete"
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
