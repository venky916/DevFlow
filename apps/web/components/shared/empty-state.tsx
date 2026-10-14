interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-base border border-border-default py-16">
      <div className="flex size-10 items-center justify-center rounded-md bg-accent-subtle text-accent">
        {icon}
      </div>
      <p className="text-body text-text-muted">{message}</p>
      {action}
    </div>
  );
}
