"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, Loader2, MapPin, Search, Sparkles, Users, Wind, X } from "lucide-react";
import { requestJoin } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Avatar, Card, Empty, SfsuBadge } from "./ui";

export type FeedPost = {
  id: string;
  title: string;
  content: string;
  place: string | null;
  startsAt: string | null;
  type: string;
  capacity: number;
  accepted: number;
  tags: string[];
  timeLeft: string;
  urgent: boolean;
  author: { name: string; username: string; sfsu: boolean };
  mine: boolean;
  myStatus: string | null;
  why: string | null;
};

export function Feed({ posts }: { posts: FeedPost[] }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }, [posts]);
  const shown = posts.filter((p) => {
    if (tag && !p.tags.includes(tag)) return false;
    const s = q.trim().toLowerCase();
    return !s || [p.title, p.content, p.place ?? "", p.author.name, ...p.tags].join(" ").toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search invites, places, people..."
          className="w-full rounded-xl border bg-card py-2.5 pr-9 pl-9 text-sm outline-none transition focus:ring-2 focus:ring-primary/40"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
      </div>
      {allTags.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95",
                tag === t ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      {posts.length === 0 ? (
        <Empty icon={Wind}>Nothing here yet. <Link href="/new" className="font-medium text-primary underline-offset-2 hover:underline">Post the first invite!</Link></Empty>
      ) : shown.length === 0 ? (
        <Empty icon={Search}>No invites match that. Try another word.</Empty>
      ) : (
        <div className="space-y-4">
          {shown.map((p, i) => <PostCard key={p.id} p={p} i={i} onTag={setTag} />)}
        </div>
      )}
    </div>
  );
}

function PostCard({ p, i, onTag }: { p: FeedPost; i: number; onTag: (t: string) => void }) {
  const left = Math.max(0, p.capacity - p.accepted);
  return (
    <Card className="animate-fade-up transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" style={{ animationDelay: `${i * 50}ms` }}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={p.author.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">{p.author.name} {p.author.sfsu && <SfsuBadge />}</div>
          <div className="text-xs text-muted-foreground">@{p.author.username}</div>
        </div>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs", p.urgent ? "bg-primary/15 font-medium text-primary" : "bg-muted text-muted-foreground")}>
          <Clock className="size-3" />{p.timeLeft}
        </span>
      </div>
      <h2 className="text-lg font-semibold">{p.title}</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{p.content}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {p.place && <span className="flex items-center gap-1"><MapPin className="size-3.5 text-primary" />{p.place}</span>}
        {p.startsAt && <span className="flex items-center gap-1"><Clock className="size-3.5 text-primary" />{p.startsAt}</span>}
        <span className="flex items-center gap-1"><Users className="size-3.5 text-primary" />{p.type === "SINGLE" ? "Just one person" : "Group"}</span>
      </div>
      {p.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <button key={t} onClick={() => onTag(t)} className="cursor-pointer rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/20">#{t}</button>
          ))}
        </div>
      )}
      {p.why && <p className="mt-3 flex items-center gap-1.5 text-xs text-primary"><Sparkles className="size-3.5" />{p.why}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {p.capacity <= 10 && (
            <span className="flex gap-1">
              {Array.from({ length: p.capacity }, (_, k) => <span key={k} className={cn("size-2.5 rounded-full", k < p.accepted ? "bg-primary" : "border border-primary/50")} />)}
            </span>
          )}
          {left === 0 ? "Full" : left === 1 ? "1 spot left" : `${left} spots left`}
        </div>
        <JoinButton p={p} full={left === 0} />
      </div>
    </Card>
  );
}

function JoinButton({ p, full }: { p: FeedPost; full: boolean }) {
  const [status, setStatus] = useState(p.myStatus);
  const [pending, start] = useTransition();
  if (p.mine) return <span className="text-xs text-muted-foreground">Your invite</span>;
  if (status === "ACCEPTED") return <span className="flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary"><Check className="size-3.5" />You&apos;re in</span>;
  if (status === "PENDING") return <span className="animate-pop flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium"><Check className="size-3.5" />Request sent</span>;
  if (status === "DECLINED") return <span className="text-xs text-muted-foreground">Not this time</span>;
  if (full) return null;
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { setStatus("PENDING"); await requestJoin(p.id); })}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}I&apos;m in
    </button>
  );
}
