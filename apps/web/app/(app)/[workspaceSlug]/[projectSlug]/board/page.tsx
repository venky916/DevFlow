import { BoardPage } from '../../../../../components/board/board-page';

export async function generateMetadata({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  return {
    title: `${projectSlug} — Board`,
  };
}

export default function Page() {
  return <BoardPage />;
}
