interface PageHeadingProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeading({ title, description, actions }: PageHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="text-body text-text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
