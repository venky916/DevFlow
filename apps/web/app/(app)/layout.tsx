import { AuthGuard } from "../../components/auth/auth-guard";
import { AppSidebar } from "../../components/layout/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">{children}</div>
      </div>
    </AuthGuard>
  );
}
