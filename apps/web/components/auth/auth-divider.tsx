export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border-default" />
      <span className="text-xs tracking-wider text-text-disabled uppercase">or</span>
      <div className="h-px flex-1 bg-border-default" />
    </div>
  );
}
