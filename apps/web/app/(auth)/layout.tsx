export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-app">
      <div className="w-full max-w-100 px-4">{children}</div>
    </div>
  );
}
