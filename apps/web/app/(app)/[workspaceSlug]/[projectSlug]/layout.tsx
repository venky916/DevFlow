import { ProjectSidebar } from "../../../../components/layout/project-sidebar";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <ProjectSidebar />
      <main className="flex-1 overflow-auto bg-bg-app">{children}</main>
    </div>
  );
}
