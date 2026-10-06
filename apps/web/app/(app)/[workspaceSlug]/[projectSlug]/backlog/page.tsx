import { BacklogPage } from '../../../../../components/backlog/backlog-page';

export async function generateMetadata({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  return {
    title: `${projectSlug} — Backlog`,
  };
}

export default function Page() {
  return <BacklogPage />;
}
