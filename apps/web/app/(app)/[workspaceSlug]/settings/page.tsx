import { WorkspaceSettings } from '../../../../components/workspace/workspace-settings';

export async function generateMetadata({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return {
    title: `${workspaceSlug} — Settings`,
  };
}

export default function Page() {
  return <WorkspaceSettings />;
}
