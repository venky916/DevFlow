'use client';

import { LabelMultiSelect } from '@devflow/ui/components/label-multi-select';

import { useProjectLabels } from '../../hooks/use-project-settings';

interface Props {
  projectId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  disabled?: boolean;
}

export function ProjectLabelSelect({ projectId, selectedIds, onChange, label, disabled }: Props) {
  const { data: labels } = useProjectLabels(projectId);

  return (
    <LabelMultiSelect
      labels={labels ?? []}
      selectedIds={selectedIds}
      onChange={onChange}
      label={label}
      disabled={disabled}
    />
  );
}
