"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Calendar } from "lucide-react";
import { PRIORITY_OPTIONS, TYPE_OPTIONS } from "../../lib/issue-constants";
import { useProjectLabels } from "../../hooks/use-project-settings";
import type { IUserPublic } from "@devflow/types";
import { useProjectSprints } from "../../hooks/use-issues";

export type FilterField =
  | "assignee"
  | "label"
  | "priority"
  | "type"
  | "dueDate"
  | "project"
  | "sprint";
export type DueDatePreset =
  | "overdue"
  | "today"
  | "this_week"
  | "no_due_date"
  | "custom";

export interface IssueFilters {
  assigneeId?: string;
  labelId?: string;
  priority?: string;
  type?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  noDueDate?: boolean;
  dueDatePreset?: DueDatePreset; // UI-only — not sent to the API directly
  projectId?: string;
  sprintId?: string;
}

interface Props {
  fields: FilterField[];
  projectId?: string;
  members?: IUserPublic[];
  projectOptions?: { label: string; value: string }[];
  filters: IssueFilters;
  onChange: (filters: IssueFilters) => void;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}

function FilterDropdown({
  label,
  active,
  options,
  onSelect,
}: {
  label: string;
  active?: string;
  options: { label: string; value: string }[];
  onSelect: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = options.find((o) => o.value === active)?.label;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border text-[12px] transition-colors ${
          activeLabel
            ? "border-accent text-accent bg-accent-subtle"
            : "border-border-default text-text-muted hover:text-text-primary"
        }`}
      >
        {activeLabel ?? label}
        {activeLabel ? (
          <X
            className="h-3 w-3"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(undefined);
            }}
          />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-[140px] bg-bg-surface border border-border-default rounded-[4px] shadow-lg py-1">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-text-primary hover:bg-bg-surface-hover transition-colors"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DUE_DATE_PRESETS: { label: string; value: DueDatePreset }[] = [
  { label: "Overdue", value: "overdue" },
  { label: "Due today", value: "today" },
  { label: "Due this week", value: "this_week" },
  { label: "No due date", value: "no_due_date" },
  { label: "Custom range", value: "custom" },
];

function DueDateFilter({
  filters,
  onChange,
}: {
  filters: IssueFilters;
  onChange: (f: IssueFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = DUE_DATE_PRESETS.find(
    (p) => p.value === filters.dueDatePreset,
  )?.label;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const applyPreset = (preset: DueDatePreset) => {
    const now = new Date();
    if (preset === "overdue") {
      onChange({
        ...filters,
        dueDatePreset: preset,
        dueDateFrom: undefined,
        dueDateTo: now.toISOString(),
        noDueDate: undefined,
      });
      setOpen(false);
    } else if (preset === "today") {
      onChange({
        ...filters,
        dueDatePreset: preset,
        dueDateFrom: startOfDay(now).toISOString(),
        dueDateTo: endOfDay(now).toISOString(),
        noDueDate: undefined,
      });
      setOpen(false);
    } else if (preset === "this_week") {
      onChange({
        ...filters,
        dueDatePreset: preset,
        dueDateFrom: startOfWeek(now).toISOString(),
        dueDateTo: endOfWeek(now).toISOString(),
        noDueDate: undefined,
      });
      setOpen(false);
    } else if (preset === "no_due_date") {
      onChange({
        ...filters,
        dueDatePreset: preset,
        dueDateFrom: undefined,
        dueDateTo: undefined,
        noDueDate: true,
      });
      setOpen(false);
    } else {
      // custom — keep popover open so the date inputs below can be used
      onChange({ ...filters, dueDatePreset: preset, noDueDate: undefined });
    }
  };

  const clear = () =>
    onChange({
      ...filters,
      dueDatePreset: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      noDueDate: undefined,
    });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border text-[12px] transition-colors ${
          activeLabel
            ? "border-accent text-accent bg-accent-subtle"
            : "border-border-default text-text-muted hover:text-text-primary"
        }`}
      >
        <Calendar className="h-3 w-3" />
        {activeLabel ?? "Due date"}
        {activeLabel && (
          <X
            className="h-3 w-3"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
          />
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-[180px] bg-bg-surface border border-border-default rounded-[4px] shadow-lg py-1">
          {DUE_DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className="w-full text-left px-3 py-1.5 text-[12px] text-text-primary hover:bg-bg-surface-hover transition-colors"
            >
              {p.label}
            </button>
          ))}
          {filters.dueDatePreset === "custom" && (
            <div className="flex flex-col gap-1.5 px-3 py-2 border-t border-border-default mt-1">
              <input
                type="date"
                value={filters.dueDateFrom?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dueDateFrom: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  })
                }
                className="bg-bg-surface border border-border-default rounded-[4px] px-2 py-1 text-[12px] text-text-primary"
              />
              <input
                type="date"
                value={filters.dueDateTo?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dueDateTo: e.target.value
                      ? endOfDay(new Date(e.target.value)).toISOString()
                      : undefined,
                  })
                }
                className="bg-bg-surface border border-border-default rounded-[4px] px-2 py-1 text-[12px] text-text-primary"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  fields,
  projectId,
  members,
  projectOptions,
  filters,
  onChange,
}: Props) {
  const needsLabels = fields.includes("label") && !!projectId;
  const { data: labels } = useProjectLabels(needsLabels ? projectId! : "");

  // sprint options depend on WHICHEVER project is currently selected in
  // the filters themselves (My Issues context), not a fixed projectId prop
  const needsSprints = fields.includes("sprint") && !!filters.projectId;
  const { data: sprints } = useProjectSprints(
    needsSprints ? filters.projectId! : "",
  );
  const sprintOptions =
    sprints?.map((s) => ({ label: s.name, value: s.id })) ?? [];

  const memberOptions =
    members?.map((m) => ({ label: m.name ?? m.email, value: m.id })) ?? [];
  const labelOptions =
    labels?.map((l: any) => ({ label: l.name, value: l.id })) ?? [];

  const set = (key: keyof IssueFilters) => (value: string | undefined) =>
    onChange({ ...filters, [key]: value });

  // picking a new project invalidates any sprint already selected —
  // a sprintId from the old project means nothing under the new one
  const setProject = (value: string | undefined) =>
    onChange({ ...filters, projectId: value, sprintId: undefined });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex items-center gap-2">
      {fields.includes("project") && (
        <FilterDropdown
          label="Project"
          active={filters.projectId}
          options={projectOptions ?? []}
          onSelect={setProject}
        />
      )}
      {fields.includes("sprint") && (
        <div title={!filters.projectId ? "Pick a project first" : undefined}>
          <FilterDropdown
            label="Sprint"
            active={filters.sprintId}
            options={filters.projectId ? sprintOptions : []}
            onSelect={set("sprintId")}
          />
        </div>
      )}
      {fields.includes("assignee") && (
        <FilterDropdown
          label="Assignee"
          active={filters.assigneeId}
          options={memberOptions}
          onSelect={set("assigneeId")}
        />
      )}
      {fields.includes("label") && (
        <FilterDropdown
          label="Label"
          active={filters.labelId}
          options={labelOptions}
          onSelect={set("labelId")}
        />
      )}
      {fields.includes("priority") && (
        <FilterDropdown
          label="Priority"
          active={filters.priority}
          options={PRIORITY_OPTIONS}
          onSelect={set("priority")}
        />
      )}
      {fields.includes("type") && (
        <FilterDropdown
          label="Type"
          active={filters.type}
          options={TYPE_OPTIONS}
          onSelect={set("type")}
        />
      )}
      {fields.includes("dueDate") && (
        <DueDateFilter filters={filters} onChange={onChange} />
      )}
      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
