"use client";

import Link from "next/link";
import { ArrowLeft, Menu, Search } from "lucide-react";

import { usePageHeader } from "../../hooks/use-page-header";

interface PageHeaderProps {
  pageTitle?: string;
}

export function PageHeader({ pageTitle }: PageHeaderProps) {
  const { crumbs, backHref, showBack, openSearch, toggleMobileDrawer } =
    usePageHeader(pageTitle);

  return (
    <div className="flex h-9.5 shrink-0 items-center justify-between border-b border-border-default px-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMobileDrawer}
          className="cursor-pointer text-text-muted transition-colors hover:text-text-primary min-[1025px]:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="size-3.5" />
        </button>
        {showBack && (
          <Link
            href={backHref}
            className="text-text-muted transition-colors hover:text-text-primary"
            aria-label="Back"
          >
            <ArrowLeft className="size-3.5" />
          </Link>
        )}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 font-mono text-xs"
        >
          {crumbs.map((crumb, i) => (
            <span key={`${crumb}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-muted">/</span>}
              <span
                className={
                  i === crumbs.length - 1
                    ? "text-text-secondary"
                    : "text-text-muted"
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={openSearch}
        className="flex items-center gap-1.5 text-text-muted transition-colors hover:text-text-primary"
        aria-label="Search"
      >
        <Search className="size-3.5" />
        <span className="rounded-sm border border-border-default px-1.5 py-0.5 font-mono text-2xs">
          ⌘K
        </span>
      </button>
    </div>
  );
}
