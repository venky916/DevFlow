"use client";

import { Command } from "cmdk";
import {
  Building2,
  FileText,
  FolderKanban,
  Inbox,
  ListTodo,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

import type { SearchResultType } from "@devflow/types";

import { ROUTES } from "../../constants/routes";
import { useCommandPalette } from "../../hooks/use-command-palette";

const STATIC_ITEMS = [
  { name: "Inbox", url: ROUTES.inbox, icon: Inbox },
  { name: "My Issues", url: ROUTES.myIssues, icon: ListTodo },
  { name: "Profile", url: ROUTES.profile, icon: User },
  { name: "Workspaces", url: ROUTES.workspaces, icon: Building2 },
];

const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  workspace: Building2,
  project: FolderKanban,
  issue: FileText,
  page: Settings,
};

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-body text-text-primary aria-selected:bg-bg-hover";
const GROUP_CLASS = "px-2 py-1 text-2xs text-text-muted";

export function CommandPalette() {
  const { isOpen, close, search, setSearch, results, isFetching, go } =
    useCommandPalette();

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? undefined : close())}
      label="Global search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      shouldFilter={false} // static items are filtered below, the server filters its own
    >
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-base border border-border-emphasis bg-bg-surface shadow-2xl">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search workspaces, projects, issues..."
          className="h-11 w-full border-b border-border-default bg-transparent px-4 text-body text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <Command.List className="max-h-90 overflow-y-auto p-1.5">
          <Command.Empty className="py-6 text-center text-xs text-text-muted">
            {isFetching ? "Searching..." : "No results found"}
          </Command.Empty>

          {search.length < 2 && (
            <Command.Group heading="Navigate" className={GROUP_CLASS}>
              {STATIC_ITEMS.filter((item) =>
                item.name.toLowerCase().includes(search.toLowerCase()),
              ).map((item) => (
                <Command.Item
                  key={item.url}
                  value={item.name}
                  onSelect={() => go(item.url)}
                  className={ITEM_CLASS}
                >
                  <item.icon className="size-3.5 text-text-muted" />
                  {item.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.length > 0 && (
            <Command.Group heading="Results" className={GROUP_CLASS}>
              {results.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <Command.Item
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => go(item.url)}
                    className={ITEM_CLASS}
                  >
                    <Icon className="size-3.5 shrink-0 text-text-muted" />
                    <span className="truncate">{item.name}</span>
                    {item.context && (
                      <span className="ml-auto shrink-0 truncate text-2xs text-text-muted">
                        {item.context}
                      </span>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
