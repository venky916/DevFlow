import { AuthGuard } from "../../components/auth/auth-guard";
import { Navbar } from "../../components/layout/navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">{children}</div>
      </div>
    </AuthGuard>
  );
}
