import { useState } from "react";
import { useMe } from "../../../hooks/use-auth";
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from "../../../hooks/use-comments";
import { useMentionSuggestion } from "../../../hooks/use-mention-suggestion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Avatar } from "@devflow/ui/components/avatar";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { CommentBox } from "@devflow/ui/components/comment-box";
import { CommentContent } from "@devflow/ui/components/comment-content";

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
  const mentionSuggestion = useMentionSuggestion(projectId);

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = async (json: object) => {
    try {
      await createComment({ content: json });
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handleEdit = async (commentId: string, json: object) => {
    try {
      await updateComment({ commentId, content: json });
      setEditingId(null);
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-medium text-text-primary">
        Comments
        {!!comments?.length && (
          <span className="ml-2 text-text-muted font-normal text-[12px]">
            {comments.length}
          </span>
        )}
      </p>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : (
        <div className="flex flex-col gap-5">
          {comments?.map((comment: any) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar name={comment.user?.name ?? "?"} size="sm" />
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-text-primary">
                    {comment.user?.name ?? "Unknown"}
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

                {me?.id === comment.user?.id && editingId !== comment.id && (
                  <div className="flex gap-3 mt-0.5">
                    <button
                      onClick={() => setEditingId(comment.id)}
                      className="text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[11px] text-text-muted hover:text-danger-text transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-border-default">
        <CommentBox
          onSubmit={handleCreate}
          placeholder="Add a comment..."
          mentionSuggestion={mentionSuggestion}
        />
      </div>
    </div>
  );
}
