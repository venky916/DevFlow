// app/[workspaceSlug]/page.tsx
import { WorkspacePage } from "../../../components/workspace/workspace-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return {
    title: `${workspaceSlug} — Workspace`,
  };
}

export default function Page() {
  return <WorkspacePage />;
}
