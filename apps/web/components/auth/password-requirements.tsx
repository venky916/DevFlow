"use client";

import {
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { passwordRules } from "@devflow/validators";

interface PasswordRequirementsProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
}

export function PasswordRequirements<T extends FieldValues>({
  control,
  name,
}: PasswordRequirementsProps<T>) {
  const value: unknown = useWatch({ control, name });
  const password = typeof value === "string" ? value : "";

  if (!password) return null;

  return (
    <ul className="flex flex-col gap-1">
      {passwordRules.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className="flex items-center gap-2">
            <span
              className={
                met
                  ? "size-1.5 rounded-full bg-accent"
                  : "size-1.5 rounded-full bg-text-disabled"
              }
            />
            <span
              className={
                met ? "text-xs text-accent" : "text-xs text-text-disabled"
              }
            >
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
