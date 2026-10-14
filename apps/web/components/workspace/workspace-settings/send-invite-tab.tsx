"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { WorkspaceRole } from "@devflow/types";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Select } from "@devflow/ui/components/select";
import {
  createInviteSchema,
  type CreateInviteInput,
} from "@devflow/validators";

import { useCreateInvite } from "../../../hooks/use-workspaces";
import { WORKSPACE_ROLE_OPTIONS } from "../../../lib/roles";
import { SectionHeading } from "../../shared/section-heading";

export function SendInviteTab({ workspaceId }: { workspaceId: string }) {
  const { mutate: createInvite, isPending } = useCreateInvite(workspaceId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateInviteInput>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });

  return (
    <div className="flex max-w-md flex-col gap-4">
      <SectionHeading
        title="Invite by email"
        description="Send an invite link to a colleague. The invite expires in 7 days."
      />
      <form
        onSubmit={handleSubmit((data) =>
          createInvite(data, { onSuccess: () => reset() }),
        )}
        className="flex flex-col gap-3"
      >
        <Input
          label="Email address"
          type="email"
          placeholder="colleague@company.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Select
          label="Role"
          options={WORKSPACE_ROLE_OPTIONS}
          value={watch("role")}
          onValueChange={(role) => setValue("role", role as WorkspaceRole)}
        />
        <div>
          <Button type="submit" size="sm" loading={isPending}>
            Send invite
          </Button>
        </div>
      </form>
    </div>
  );
}
