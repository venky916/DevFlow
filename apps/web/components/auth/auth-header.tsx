import { Logo } from '../shared/logo';

interface AuthHeaderProps {
  title: string;
  description?: string;
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Logo size="lg" />
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      {description && <p className="text-sm text-text-muted">{description}</p>}
    </div>
  );
}
