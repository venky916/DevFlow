import { ProjectOverview } from "../../../../components/projects/project-overview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  return {
    title: `${projectSlug} — Overview`,
  };
}

export default function Page() {
  return <ProjectOverview />;
}
