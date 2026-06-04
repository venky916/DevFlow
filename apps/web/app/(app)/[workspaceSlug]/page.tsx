import { WorkspaceSidebar } from "../../../components/layout/workspace-sidebar";
import { WorkspaceHome } from "../../../components/workspace/workspace-home";

export default function WorkspaceHomePage() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <WorkspaceSidebar />
      <main className="flex-1 overflow-auto bg-bg-app">
        <WorkspaceHome />
      </main>
    </div>
  );
}
