"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Modal } from "@devflow/ui/components/modal";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { useCreateWorkspace } from "../../hooks/use-workspaces";
import {
  createWorkspaceSchema,
  type CreateWorkspaceInput,
} from "@devflow/validators";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ open, onClose }: Props) {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateWorkspace();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
  });

  // auto generate slug from name
  const name = watch("name");
  useEffect(() => {
    if (name) {
      setValue(
        "slug",
        name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      );
    }
  }, [name]);

  const onSubmit = async (data: CreateWorkspaceInput) => {
    try {
      const workspace = await mutateAsync(data);
      toast.success("Workspace created!");
      reset();
      onClose();
      router.push(`/${workspace.slug}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create workspace");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create workspace"
      description="A workspace contains your projects and team members."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Workspace name"
          placeholder="Acme Inc"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Slug"
          placeholder="acme-inc"
          error={errors.slug?.message}
          {...register("slug")}
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create workspace"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
