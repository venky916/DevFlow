"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, LogOut, MoreHorizontal, User } from "lucide-react";

import type { IUser } from "@devflow/types";
import { Avatar } from "@devflow/ui/components/avatar";
import {
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
} from "@devflow/ui/components/dropdown";

import { ROUTES } from "../../constants/routes";
import { useSignOut } from "../../hooks/use-auth";
import { MENU_LINK_CLASS, SidebarDivider } from "./sidebar-item";

interface UserMenuProps {
  user: Pick<IUser, "name" | "email" | "avatarUrl"> | null;
  onNavigate?: () => void;
}

export function UserMenu({ user, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  const label = user?.name ?? user?.email ?? "Account";

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative mt-auto">
      <SidebarDivider />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 transition-colors hover:bg-bg-hover"
      >
        <Avatar name={label} src={user?.avatarUrl ?? undefined} size="sm" />
        <span className="flex-1 truncate text-left text-xs text-text-secondary">
          {label}
        </span>
        <MoreHorizontal className="size-3.5 shrink-0 text-text-muted" />
      </button>

      <DropdownMenu open={open} onClose={() => setOpen(false)} anchor="top">
        <Link
          href={ROUTES.profile}
          onClick={handleNavigate}
          className={MENU_LINK_CLASS}
        >
          <User className="size-3.5 shrink-0" />
          Profile
        </Link>
        <DropdownDivider />
        <Link
          href={ROUTES.workspaces}
          onClick={handleNavigate}
          className={MENU_LINK_CLASS}
        >
          <LayoutGrid className="size-3.5 shrink-0" />
          My Workspaces
        </Link>
        <DropdownDivider />
        <DropdownItem
          onClick={() => {
            setOpen(false);
            void signOut();
          }}
          icon={LogOut}
          label="Sign out"
          danger
        />
      </DropdownMenu>
    </div>
  );
}
