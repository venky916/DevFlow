"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@devflow/ui/lib/cn";
import { Avatar } from "@devflow/ui/components/avatar";
import { Badge } from "@devflow/ui/components/badge";
import { Select } from "@devflow/ui/components/select";
import {
  useIssueById,
  useUpdateIssue,
  useProjectSprints,
  useProjectMembers,
} from "../../hooks/use-issues";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "../../hooks/use-comments";
import { useIssueActivities } from "../../hooks/use-issues";
import { updateIssueSchema, type UpdateIssueInput } from "@devflow/validators";
import type { IIssueWithRelations, IssuePriority } from "@devflow/types";
import { useMe } from "../../hooks/use-auth";

// ─── Constants ────────────────────────────────────────────────────
const PRIORITY_OPTIONS = [
  { label: "No Priority", value: "NO_PRIORITY" },
  { label: "Urgent", value: "URGENT" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const STATUS_OPTIONS = [
  { label: "Backlog", value: "BACKLOG" },
  { label: "Todo", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Done", value: "DONE" },
];

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  URGENT: "#E24B4A",
  HIGH: "#EF9F27",
  MEDIUM: "#639922",
  LOW: "#555555",
  NO_PRIORITY: "#333333",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "DONE":
      return "success" as const;
    case "IN_PROGRESS":
      return "info" as const;
    case "IN_REVIEW":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

// ─── Activity item text ───────────────────────────────────────────
function activityText(action: string, meta: any): string {
  switch (action) {
    case "ISSUE_CREATED":
      return "created this issue";
    case "ISSUE_UPDATED":
      return "updated this issue";
    case "ISSUE_STATUS_CHANGED":
      return `moved to ${STATUS_LABELS[meta?.to] ?? meta?.to}`;
    case "COMMENT_ADDED":
      return "added a comment";
    case "COMMENT_DELETED":
      return "deleted a comment";
    default:
      return action.toLowerCase().replace(/_/g, " ");
  }
}

// ─── Field row ────────────────────────────────────────────────────
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted w-[80px] shrink-0">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export function IssueDetailPage({ issueId }: { issueId: string }) {
  const router = useRouter();
  const { data: issue, isLoading } = useIssueById(issueId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-text-muted">Issue not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-[38px] border-b border-border-default shrink-0">
        <button
          onClick={() => router.back()}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-mono text-accent">
          #{issue.id.slice(-6).toUpperCase()}
        </span>
        <Badge variant={getStatusVariant(issue.status)}>
          {STATUS_LABELS[issue.status]}
        </Badge>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
          <IssueMainArea issue={issue} />
          <div className="h-px bg-border-default" />
          <CommentsSection issueId={issue.id} />
        </div>

        {/* Right panel */}
        <div className="w-[400px] shrink-0 border-l border-border-default overflow-y-auto px-4 py-6 flex flex-col gap-6">
          <PropertiesPanel issue={issue} />
          <div className="h-px bg-border-default" />
          <ActivityPanel issueId={issue.id} />
        </div>
      </div>
    </div>
  );
}

// ─── Main area — title + description ─────────────────────────────
function IssueMainArea({ issue }: { issue: IIssueWithRelations }) {
  const { mutateAsync } = useUpdateIssue(issue.id, issue.projectId);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm<UpdateIssueInput>({
    resolver: zodResolver(updateIssueSchema),
    defaultValues: {
      title: issue.title,
      description: issue.description ?? "",
    },
  });

  useEffect(() => {
    reset({ title: issue.title, description: issue.description ?? "" });
  }, [issue.id]);

  const save = async (data: UpdateIssueInput) => {
    try {
      setSaving(true);
      await mutateAsync(data);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {saving && (
          <span className="flex items-center gap-1 text-[11px] text-text-muted ml-auto">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </span>
        )}
      </div>

      {/* Title */}
      <input
        className="w-full bg-transparent text-[18px] font-semibold text-text-primary placeholder:text-text-disabled focus:outline-none"
        placeholder="Issue title"
        {...register("title")}
        onBlur={handleSubmit(save)}
      />

      {/* Description */}
      <textarea
        className="w-full bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none resize-none min-h-[120px]"
        placeholder="Add a description..."
        {...register("description")}
        onBlur={handleSubmit(save)}
      />
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────
function PropertiesPanel({ issue }: { issue: IIssueWithRelations }) {
  const { mutateAsync } = useUpdateIssue(issue.id, issue.projectId);
  const { data: sprints } = useProjectSprints(issue.projectId);
  const { data: members } = useProjectMembers(issue.projectId);
  const { register, handleSubmit, setValue, watch, reset } =
    useForm<UpdateIssueInput>({
      resolver: zodResolver(updateIssueSchema),
      defaultValues: {
        status: issue.status,
        priority: issue.priority,
        assigneeId: issue.assigneeId ?? undefined,
      },
    });

  useEffect(() => {
    reset({
      status: issue.status,
      priority: issue.priority,
      assigneeId: issue.assigneeId ?? undefined,
    });
  }, [issue.id]);

  const save = async (data: UpdateIssueInput) => {
    try {
      await mutateAsync(data);
    } catch {
      toast.error("Failed to update");
    }
  };

  const sprintOptions =
    sprints?.map((s) => ({ label: s.name, value: s.id })) ?? [];
  const memberOptions =
    members?.map((m) => ({
      label: m.user?.name ?? m.user?.email ?? "Unknown",
      value: m.userId,
    })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
        Properties
      </p>

      <div className="flex flex-col gap-3">
        <FieldRow label="Status">
          <Select
            options={STATUS_OPTIONS}
            value={watch("status")}
            onValueChange={(v) => {
              setValue("status", v as UpdateIssueInput["status"]);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Priority">
          <Select
            options={PRIORITY_OPTIONS}
            value={watch("priority")}
            onValueChange={(v) => {
              setValue("priority", v as UpdateIssueInput["priority"]);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Assignee">
          <Select
            placeholder="Unassigned"
            options={memberOptions}
            value={watch("assigneeId") ?? undefined}
            onValueChange={(v) => {
              setValue("assigneeId", v || null);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Sprint">
          <Select
            placeholder="No sprint"
            options={sprintOptions}
            value={issue.sprintId ?? undefined}
            onValueChange={() => handleSubmit(save)()}
          />
        </FieldRow>

        {/* Created by */}
        {issue.creator && (
          <FieldRow label="Created by">
            <div className="flex items-center gap-2">
              <Avatar
                name={issue.creator.name ?? issue.creator.email}
                size="sm"
              />
              <span className="text-[12px] text-text-secondary">
                {issue.creator.name ?? issue.creator.email}
              </span>
            </div>
          </FieldRow>
        )}
      </div>
    </div>
  );
}

// ─── Activity panel ───────────────────────────────────────────────
function ActivityPanel({ issueId }: { issueId: string }) {
  const { data: activities, isLoading } = useIssueActivities(issueId);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
        Activity
      </p>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : !activities?.length ? (
        <p className="text-[12px] text-text-disabled">No activity yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((a: any) => (
            <div key={a.id} className="flex items-start gap-2">
              <Avatar name={a.user?.name ?? "?"} size="sm" />
              <div className="flex flex-col gap-0.5">
                <p className="text-[12px] text-text-secondary">
                  <span className="text-text-primary font-medium">
                    {a.user?.name ?? "Someone"}
                  </span>{" "}
                  {activityText(a.action, a.meta)}
                </p>
                <span className="text-[11px] text-text-muted">
                  {formatDistanceToNow(new Date(a.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comments section ─────────────────────────────────────────────
function CommentsSection({ issueId }: { issueId: string }) {
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

      {/* Comment list */}
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

                {/* Edit / Delete — only own comments */}
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
                      className="text-[11px] text-text-muted hover:text-danger-text transition-colors"
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

      {/* Comment input */}
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
