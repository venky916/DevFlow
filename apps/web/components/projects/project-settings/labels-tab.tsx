"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import type { IProjectLabel } from "@devflow/types";
import { cn } from "@devflow/ui/lib/cn";
import { Button } from "@devflow/ui/components/button";
import { ColorDot } from "@devflow/ui/components/color-dot";
import { DEFAULT_PROJECT_COLOR } from "@devflow/ui/components/color-picker";
import { ConfirmModal } from "@devflow/ui/components/confirm-modal";
import { Spinner } from "@devflow/ui/components/spinner";

import {
  useCreateLabel,
  useDeleteLabel,
  useProjectLabels,
  useUpdateLabel,
} from "../../../hooks/use-projects";
import {PageError} from "../../shared/page-error";
import { SectionHeading } from "../../shared/section-heading";

interface EditState {
  name: string;
  color: string;
}

export function LabelsTab({ projectId }: { projectId: string }) {
  const {
    data: labels,
    isLoading,
    isError,
    refetch,
  } = useProjectLabels(projectId);
  const { mutate: createLabel, isPending: isCreating } =
    useCreateLabel(projectId);
  const { mutate: updateLabel } = useUpdateLabel(projectId);
  const { mutate: deleteLabel } = useDeleteLabel(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_PROJECT_COLOR);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    name: "",
    color: "",
  });

  const [deletingLabel, setDeletingLabel] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createLabel(
      { name, color: newColor },
      {
        onSuccess: () => {
          setNewName("");
          setNewColor(DEFAULT_PROJECT_COLOR);
          setShowCreate(false);
        },
      },
    );
  };

  const startEdit = (label: IProjectLabel) => {
    setEditingId(label.id);
    setEditState({ name: label.name, color: label.color });
  };

  const handleUpdate = (labelId: string) => {
    const name = editState.name.trim();
    if (!name) return;
    updateLabel(
      { labelId, data: { name, color: editState.color } },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleDelete = () => {
    if (!deletingLabel) return;
    deleteLabel(deletingLabel.id, { onSettled: () => setDeletingLabel(null) });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }
  if (isError || !labels) {
    return (
      <PageError message="Couldn't load labels" onRetry={() => refetch()} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <SectionHeading
          title="Labels"
          description="Used to categorize issues."
        />
        {!showCreate && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-1.5 size-3.5" />
            New label
          </Button>
        )}
      </div>

      {labels.length === 0 && !showCreate ? (
        <p className="py-4 text-body text-text-muted">
          No labels yet. Create one to categorize issues.
        </p>
      ) : (
        <div className="overflow-hidden rounded-base border border-border-default">
          {showCreate && (
            <div className="flex items-center gap-3 bg-bg-surface px-3 py-2">
              <ColorDot color={newColor} onChange={setNewColor} />
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowCreate(false);
                }}
                placeholder="Label name..."
                className="h-7 flex-1 bg-transparent px-1.5 text-body text-text-primary outline-none placeholder:text-text-muted"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                className="shrink-0 text-success-text transition-colors hover:text-success-text/80 disabled:opacity-40"
                aria-label="Create label"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {labels.map((label, i) => (
            <div
              key={label.id}
              className={cn(
                "group flex items-center gap-3 px-3 py-2",
                (i > 0 || showCreate) && "border-t border-border-default",
              )}
            >
              {editingId === label.id ? (
                <>
                  <ColorDot
                    color={editState.color}
                    onChange={(color) => setEditState((s) => ({ ...s, color }))}
                  />
                  <input
                    autoFocus
                    value={editState.name}
                    onChange={(e) =>
                      setEditState((s) => ({ ...s, name: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(label.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 flex-1 bg-transparent px-1.5 text-body text-text-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdate(label.id)}
                    className="shrink-0 text-success-text transition-colors hover:text-success-text/80"
                    aria-label="Save"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
                    aria-label="Cancel"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-body text-text-primary">
                    {label.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startEdit(label)}
                      className="flex size-6 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                      aria-label="Edit label"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeletingLabel({ id: label.id, name: label.name })
                      }
                      className="flex size-6 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-danger-bg hover:text-danger-text"
                      aria-label="Delete label"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deletingLabel}
        onClose={() => setDeletingLabel(null)}
        onConfirm={handleDelete}
        title="Delete label?"
        description={`"${deletingLabel?.name}" will be removed from all issues using it.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
