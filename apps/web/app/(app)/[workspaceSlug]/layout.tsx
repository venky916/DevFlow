import { WorkspaceAccessGuard } from '../../../components/workspace/workspace-access-guard';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceAccessGuard>{children}</WorkspaceAccessGuard>;
}
