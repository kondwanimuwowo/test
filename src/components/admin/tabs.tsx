"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBarIcon, Cog6ToothIcon, PhotoIcon, UsersIcon } from "@heroicons/react/20/solid";

const TABS = [
  { href: "/admin", label: "Overview", icon: ChartBarIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/content", label: "Content", icon: PhotoIcon },
  { href: "/admin/settings", label: "Settings", icon: Cog6ToothIcon },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-2 flex gap-2 overflow-x-auto py-4">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
              active ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
