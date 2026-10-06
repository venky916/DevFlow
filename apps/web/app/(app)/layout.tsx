import { AuthGuard } from '../../components/auth/auth-guard';
import { AppSidebar } from '../../components/layout/app-sidebar';
import { CommandPalette } from '../../components/layout/command-palette';
import { PageHeader } from '../../components/layout/page-header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <PageHeader />
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
      <CommandPalette />
    </AuthGuard>
  );
}
