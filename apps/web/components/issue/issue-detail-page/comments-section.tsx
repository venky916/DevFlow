'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@devflow/ui/components/avatar';
import { CommentBox } from '@devflow/ui/components/comment-box';
import { CommentContent } from '@devflow/ui/components/comment-content';

import { useMe } from '../../../hooks/use-auth';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../../../hooks/use-comments';
import { useMentionSuggestion } from '../../../hooks/use-mention-suggestion';
import { usePermissions } from '../../../hooks/use-permissions';
import { canDeleteComment, canEditComment } from '../../../lib/permissions';

interface CommentsSectionProps {
  issueId: string;
  projectId: string;
}

export function CommentsSection({ issueId, projectId }: CommentsSectionProps) {
  const { data: comments, isLoading } = useComments(issueId);
  const { mutateAsync: createComment } = useCreateComment(issueId);
  const { mutateAsync: updateComment } = useUpdateComment(issueId);
  const { mutateAsync: deleteComment } = useDeleteComment(issueId);
  const { data: me } = useMe();
  const { access } = usePermissions();
  const mentionSuggestion = useMentionSuggestion(projectId);

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async (json: object) => {
    try {
      await createComment({ content: json });
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleEdit = async (commentId: string, json: object) => {
    try {
      await updateComment({ commentId, content: json });
      setEditingId(null);
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch {
      toast.error('Failed to delete comment');
    }
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
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : (
        <div className="flex flex-col gap-5">
          {comments?.map((comment: any) => {
            const canEdit = me ? canEditComment(comment, me.id) : false;
            const canDelete = me ? canDeleteComment(access, comment, me.id) : false;

            return (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar name={comment.user?.name ?? '?'} size="sm" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-text-primary">
                      {comment.user?.name ?? 'Unknown'}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {editingId === comment.id ? (
                    <CommentBox
                      initialContent={comment.content}
                      placeholder="Edit comment..."
                      mentionSuggestion={mentionSuggestion}
                      submitLabel="Save"
                      onSubmit={(json) => handleEdit(comment.id, json)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <CommentContent content={comment.content} />
                  )}

                  {editingId !== comment.id && (canEdit || canDelete) && (
                    <div className="mt-0.5 flex gap-3">
                      {canEdit && (
                        <button
                          onClick={() => setEditingId(comment.id)}
                          className="cursor-pointer text-[11px] text-text-muted transition-colors hover:text-text-primary"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(comment.id)}
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
    </div>
  );
}
