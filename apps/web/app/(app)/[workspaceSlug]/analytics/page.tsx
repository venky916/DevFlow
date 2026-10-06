import { WorkspaceAnalytics } from '../../../../components/workspace/workspace-analytics';

export async function generateMetadata({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return {
    title: `${workspaceSlug} — Analytics`,
  };
}

export default function Page() {
  return <WorkspaceAnalytics />;
}
