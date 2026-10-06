'use client';

import type { IssueType } from '@devflow/types';
import { Select } from '@devflow/ui/components/select';

import { TYPE_OPTIONS } from '../../lib/issue-constants';

interface Props {
  value: IssueType | undefined;
  onValueChange: (value: IssueType) => void;
  label?: string;
  disabled?: boolean;
}

export function IssueTypeSelect({ value, onValueChange, label, disabled }: Props) {
  return (
    <Select
      label={label}
      options={TYPE_OPTIONS}
      value={value}
      onValueChange={(v) => onValueChange(v as IssueType)}
      disabled={disabled}
    />
  );
}
