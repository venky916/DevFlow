// components/command-palette.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Inbox,
  ListTodo,
  User,
  Building2,
  FolderKanban,
  FileText,
  Settings,
} from "lucide-react";
import { useUIStore } from "../../stores/ui.store";
import { useGlobalSearch } from "../../hooks/use-global-search";
import { useDebouncedValue } from "../../hooks/use-debounced-value";

const STATIC_ITEMS = [
  { name: "Inbox", url: "/inbox", icon: Inbox },
  { name: "My Issues", url: "/my-issues", icon: ListTodo },
  { name: "Profile", url: "/profile", icon: User },
  { name: "Workspaces", url: "/workspaces", icon: Building2 },
];

const TYPE_ICON = {
  workspace: Building2,
  project: FolderKanban,
  issue: FileText,
  page: Settings,
} as const;

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const toggle = useUIStore((s) => s.toggleCommandPalette);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const { data: results, isFetching } = useGlobalSearch(debouncedSearch);

  // global Cmd/Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle]);

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const go = (url: string) => {
    close();
    router.push(url);
  };

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? undefined : close())}
      label="Global search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      shouldFilter={false} // we filter static items ourselves; server already filtered its own
    >
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative z-10 w-full max-w-[560px] rounded-[4px] border border-border-emphasis bg-bg-surface shadow-2xl overflow-hidden">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search workspaces, projects, issues..."
          className="w-full h-11 px-4 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted border-b border-border-default focus:outline-none"
        />
        <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
          <Command.Empty className="py-6 text-center text-[12px] text-text-muted">
            {isFetching ? "Searching..." : "No results found"}
          </Command.Empty>

          {search.length < 2 && (
            <Command.Group
              heading="Navigate"
              className="text-[11px] text-text-muted px-2 py-1"
            >
              {STATIC_ITEMS.filter((i) =>
                i.name.toLowerCase().includes(search.toLowerCase()),
              ).map((item) => (
                <Command.Item
                  key={item.url}
                  value={item.name}
                  onSelect={() => go(item.url)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-[3px] text-[13px] text-text-primary cursor-pointer aria-selected:bg-bg-hover"
                >
                  <item.icon className="h-3.5 w-3.5 text-text-muted" />
                  {item.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results && results.length > 0 && (
            <Command.Group
              heading="Results"
              className="text-[11px] text-text-muted px-2 py-1"
            >
              {results.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <Command.Item
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => go(item.url)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-[3px] text-[13px] text-text-primary cursor-pointer aria-selected:bg-bg-hover"
                  >
                    <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {item.context && (
                      <span className="ml-auto text-[11px] text-text-muted truncate shrink-0">
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
