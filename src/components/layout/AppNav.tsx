"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface AppNavProps {
  profile: Profile | null;
}

const NAV_ITEMS = [
  { href: "/locker", label: "Locker Room", icon: "🚪" },
  { href: "/field", label: "The Field", icon: "🏟️" },
  { href: "/winners", label: "Winner's Circle", icon: "🏆" },
  { href: "/lost", label: "Lost Zone", icon: "📋" },
  { href: "/office", label: "Coach's Office", icon: "📊" },
];

export function AppNav({ profile }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const allItems = [
    ...NAV_ITEMS,
    ...(profile?.role === "manager"
      ? [{ href: "/manager", label: "Team View", icon: "👥" }]
      : []),
  ];

  return (
    <header className="bg-field-dark border-b border-field-line/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/locker"
            className="flex items-center gap-2 shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            <span className="text-xl">🏈</span>
            <span className="font-bold text-field-cream hidden xs:inline sm:inline">
              The Field
            </span>
          </Link>

          <nav className="hidden md:flex gap-1">
            {allItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {profile && (
            <span className="text-sm text-field-cream/70 hidden lg:inline truncate max-w-[140px]">
              {profile.full_name}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-field-cream/50 hover:text-field-cream transition px-2 py-1"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden w-9 h-9 rounded-lg border border-field-line/20 text-field-cream/70 hover:bg-field-turf/20 flex items-center justify-center"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-field-line/15 px-4 py-3 grid grid-cols-2 gap-2">
          {allItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-field-turf/30 text-field-cream"
                  : "text-field-cream/70 hover:bg-field-turf/10"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function NavLink({
  item,
  isActive,
}: {
  item: { href: string; label: string; icon: string };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
        isActive
          ? "bg-field-turf/30 text-field-cream"
          : "text-field-cream/60 hover:text-field-cream hover:bg-field-turf/10"
      }`}
    >
      {item.label}
    </Link>
  );
}