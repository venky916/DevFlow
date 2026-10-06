import { SprintsPage } from '../../../../../components/sprints/sprints-page';

export async function generateMetadata({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  return {
    title: `${projectSlug} — Sprints`,
  };
}

export default function Page() {
  return <SprintsPage />;
}
