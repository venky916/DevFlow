import { ProjectAccessGuard } from "../../../../components/projects/project-access-guard";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectAccessGuard>{children}</ProjectAccessGuard>;
}
