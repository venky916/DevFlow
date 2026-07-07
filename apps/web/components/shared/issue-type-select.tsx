"use client";

import { Select } from "@devflow/ui/components/select";
import { TYPE_OPTIONS } from "../../lib/issue-constants";
import type { IssueType } from "@devflow/types";

interface Props {
  value: IssueType | undefined;
  onValueChange: (value: IssueType) => void;
  label?: string;
  disabled?: boolean;
}

export function IssueTypeSelect({
  value,
  onValueChange,
  label,
  disabled,
}: Props) {
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
