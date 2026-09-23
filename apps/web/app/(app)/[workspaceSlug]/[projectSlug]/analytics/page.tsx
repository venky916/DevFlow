import { ProjectAnalytics } from "../../../../../components/projects/project-analytics";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  return {
    title: `${projectSlug} — Analytics`,
  };
}

export default function Page() {
  return <ProjectAnalytics />;
}
