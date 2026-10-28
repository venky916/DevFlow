import Link from 'next/link';

interface AuthFooterLinkProps {
  text: string;
  label: string;
  href: string;
}

export function AuthFooterLink({ text, label, href }: AuthFooterLinkProps) {
  return (
    <p className="text-center text-sm text-text-muted">
      {text}{' '}
      <Link href={href} className="text-accent transition-colors hover:text-accent-hover">
        {label}
      </Link>
    </p>
  );
}
