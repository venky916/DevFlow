"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../lib/cn";

interface Tab {
  label: string;
  value: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  tabs,
  defaultValue,
  className,
  value,
  onValueChange,
}: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-col gap-0", className)}
    >
      <RadixTabs.List className="flex border-b border-border-default">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "px-4 py-2 text-[13px] text-text-muted transition-colors",
              "border-b-2 border-transparent -mb-px",
              "hover:text-text-primary",
              "data-[state=active]:text-text-primary data-[state=active]:border-accent",
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content key={tab.value} value={tab.value} className="pt-6">
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
