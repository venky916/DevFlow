import { Badge } from "@devflow/ui/components/badge";
import type { WorkspaceRole, ProjectRole } from "../../lib/permissions";

type Role = WorkspaceRole | ProjectRole;

const ROLE_CONFIG: Record<
  Role,
  { label: string; variant: "success" | "info" | "medium" | "neutral" }
> = {
  ADMIN: { label: "Admin", variant: "success" },
  MEMBER: { label: "Member", variant: "neutral" },
  LEAD: { label: "Lead", variant: "info" },
  DEVELOPER: { label: "Developer", variant: "medium" },
  VIEWER: { label: "Viewer", variant: "neutral" },
};

export function RoleBadge({ role }: { role: Role | null }) {
  if (!role) return null;
  const config = ROLE_CONFIG[role];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
