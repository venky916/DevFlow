"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, FolderKanban } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { CreateWorkspaceModal } from "./create-workspace-modal";

export function WorkspacesList() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full py-12 px-4">
      <div className="w-full max-w-[520px] flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-text-primary">
              Workspaces
            </h1>
            <p className="text-[13px] text-text-muted mt-0.5">
              Select a workspace to continue
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New workspace
          </Button>
        </div>

        {/* List */}
        {workspaces?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-border-default rounded-[4px]">
            <div className="h-10 w-10 rounded-[5px] bg-accent-subtle flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-accent" />
            </div>
            <p className="text-[13px] text-text-muted">No workspaces yet</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(true)}
            >
              Create your first workspace
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces?.map((ws: any) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/${ws.slug}`)}
                className="flex items-center gap-3 p-4 rounded-[4px] border border-border-default bg-bg-surface hover:border-border-emphasis hover:bg-bg-hover transition-colors text-left w-full"
              >
                {ws.logoUrl ? (
                  <img
                    src={ws.logoUrl}
                    alt={ws.name}
                    className="h-[38px] w-[38px] rounded-[5px] object-cover"
                  />
                ) : (
                  // icon
                  <div className="h-[38px] w-[38px] rounded-[5px] bg-accent-subtle flex items-center justify-center shrink-0">
                    <span className="text-accent text-[16px] font-bold font-mono">
                      {ws.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-text-primary truncate">
                    {ws.name}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    {ws.slug}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-text-muted">
                    <Users className="h-3 w-3" />
                    {ws._count?.members ?? 0}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-text-muted">
                    <FolderKanban className="h-3 w-3" />
                    {ws._count?.projects ?? 0}
                  </div>
                  {/* <span className="text-[11px] text-text-muted font-mono uppercase">
                    {ws.role} api not sending role yet
                  </span> */}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateWorkspaceModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
