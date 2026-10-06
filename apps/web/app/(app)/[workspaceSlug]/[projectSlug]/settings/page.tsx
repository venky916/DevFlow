import { ProjectSettings } from '../../../../../components/projects/project-settings';

export async function generateMetadata({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  return {
    title: `${projectSlug} — Settings`,
  };
}

export default function Page() {
  return <ProjectSettings />;
}
