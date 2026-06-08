import { PageHeader } from "../../../../components/layout/page-header";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-auto bg-bg-app">{children}</main>
    </div>
  );
}
