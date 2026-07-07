import { useRef, useState } from "react";
import { useMe } from "../../../hooks/use-auth";
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from "../../../hooks/use-comments";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Avatar } from "@devflow/ui/components/avatar";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";



export function CommentsSection({ issueId }: { issueId: string }) {
  const { data: comments, isLoading } = useComments(issueId);
  const { mutateAsync: createComment } = useCreateComment(issueId);
  const { mutateAsync: updateComment } = useUpdateComment();
  const { mutateAsync: deleteComment } = useDeleteComment(issueId);
  const { data: me } = useMe();

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      setSubmitting(true);
      await createComment({ content: text.trim() });
      setText("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await updateComment({ commentId, content: editText.trim() });
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
                  <div className="flex flex-col gap-2">
                    <textarea
                      className="w-full bg-bg-surface border border-border-default rounded-[4px] px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-border-emphasis resize-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(comment.id)}
                        className="text-[12px] text-accent hover:text-accent-hover transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    {comment.content}
                  </p>
                )}

                {me?.id === comment.user?.id && editingId !== comment.id && (
                  <div className="flex gap-3 mt-0.5">
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditText(comment.content);
                      }}
                      className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[11px] text-text-muted hover:text-status-danger-text transition-colors"
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

      <div className="flex items-start gap-3 pt-2 border-t border-border-default">
        {me && <Avatar name={me.name ?? me.email} size="sm" />}
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            className="w-full bg-bg-surface border border-border-default rounded-[4px] px-3 py-2 text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-emphasis resize-none transition-colors"
            placeholder="Add a comment..."
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">
              ⌘ + Enter to submit
            </span>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="px-3 py-1.5 bg-accent text-accent-text text-[12px] font-medium rounded-[4px] hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Comment"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
