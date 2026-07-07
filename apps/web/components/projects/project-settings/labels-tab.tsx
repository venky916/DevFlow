"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Check } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Spinner } from "@devflow/ui/components/spinner";
import {
  ColorPicker,
  DEFAULT_PROJECT_COLOR,
} from "@devflow/ui/components/color-picker";
import { SectionHeading } from "../../shared/section-heading";
import { LabelChip } from "@devflow/ui/components/label-chip";
import {
  useProjectLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from "../../../hooks/use-project-settings";

interface Props {
  projectId: string;
}

interface EditState {
  name: string;
  color: string;
}

export function LabelsTab({ projectId }: Props) {
  const { data: labels, isLoading } = useProjectLabels(projectId);
  const { mutate: createLabel, isPending: isCreating } =
    useCreateLabel(projectId);
  const { mutate: updateLabel } = useUpdateLabel(projectId);
  const { mutate: deleteLabel } = useDeleteLabel(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_PROJECT_COLOR);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    name: "",
    color: "",
  });

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createLabel(
      { name: trimmed, color: newColor },
      {
        onSuccess: () => {
          toast.success("Label created");
          setNewName("");
          setNewColor(DEFAULT_PROJECT_COLOR);
          setShowCreate(false);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? "Failed to create label"),
      },
    );
  };

  const startEdit = (label: { id: string; name: string; color: string }) => {
    setEditingId(label.id);
    setEditState({ name: label.name, color: label.color });
  };

  const handleUpdate = (labelId: string) => {
    const trimmed = editState.name.trim();
    if (!trimmed) return;
    updateLabel(
      { labelId, data: { name: trimmed, color: editState.color } },
      {
        onSuccess: () => {
          toast.success("Label updated");
          setEditingId(null);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? "Failed to update label"),
      },
    );
  };

  const handleDelete = (labelId: string) => {
    deleteLabel(labelId, {
      onSuccess: () => toast.success("Label deleted"),
      onError: () => toast.error("Failed to delete label"),
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <SectionHeading
          title="Labels"
          description="Manage labels for this project. Used to categorize issues."
        />
        {!showCreate && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New label
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* create row */}
        {showCreate && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] border border-accent bg-bg-surface">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowCreate(false);
              }}
              placeholder="Label name..."
              className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none"
            />
            <div className="w-[150px] shrink-0">
              <ColorPicker value={newColor} onChange={(c) => setNewColor(c)} />
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-text-muted hover:text-text-primary transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* existing labels */}
        {!labels?.length && !showCreate ? (
          <p className="text-[13px] text-text-muted py-4">
            No labels yet. Create one to categorize issues.
          </p>
        ) : (
          labels?.map((label: any) => (
            <div
              key={label.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-border-default hover:border-border-emphasis transition-colors"
            >
              {editingId === label.id ? (
                <>
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
                    className="flex-1 bg-transparent text-[13px] text-text-primary outline-none"
                  />
                  <div className="w-[150px] shrink-0">
                    <ColorPicker
                      value={editState.color}
                      onChange={(c) =>
                        setEditState((s) => ({ ...s, color: c }))
                      }
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate(label.id)}
                    className="text-success-text hover:text-success-text/80 transition-colors shrink-0"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <LabelChip
                      name={label.name}
                      color={label.color}
                      size="md"
                    />
                  </div>
                  <button
                    onClick={() => startEdit(label)}
                    className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(label.id)}
                    className="text-text-muted hover:text-danger-text transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
