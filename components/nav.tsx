"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Inbox, MessageCircle, Star, Trophy, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/banter", label: "Banter", icon: Megaphone },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/ratings", label: "Ratings", icon: Star },
  { href: "/scoreboard", label: "Scoreboard", icon: Trophy },
];

export function NavLinks({ compact }: { compact?: boolean }) {
  const path = usePathname();
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm font-medium transition",
              compact ? "p-2" : "px-3 py-2",
              active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4.5" />
            {!compact && label}
          </Link>
        );
      })}
    </>
  );
}

export function CreateButton() {
  return (
    <Link
      href="/new"
      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
    >
      <Plus className="size-5" /> Start an invite
    </Link>
  );
}

export function FloatingCreate() {
  const path = usePathname();
  if (path === "/new" || path.startsWith("/chats/")) return null;
  return (
    <Link
      href="/new"
      aria-label="Start an invite"
      className="group fixed right-5 bottom-5 z-20 flex items-center gap-2 rounded-full bg-primary p-4 text-primary-foreground shadow-xl shadow-primary/40 transition hover:scale-105 active:scale-95 md:right-8 md:bottom-8 md:px-5"
    >
      <Plus className="size-6 transition group-hover:rotate-90" />
      <span className="hidden text-sm font-semibold md:inline">Start an invite</span>
    </Link>
  );
}
