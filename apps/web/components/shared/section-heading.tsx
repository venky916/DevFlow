// components/shared/section-heading.tsx
interface Props {
  title: string;
  description?: string;
}

export function SectionHeading({ title, description }: Props) {
  return (
    <div className="mb-5">
      <p className="text-[13px] font-medium text-text-primary">{title}</p>
      {description && (
        <p className="text-[12px] text-text-muted mt-0.5">{description}</p>
      )}
    </div>
  );
}
