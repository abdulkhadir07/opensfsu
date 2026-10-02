"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Flame, Heart, Loader2, MessageCircle, Send, Clock, Sparkles } from "lucide-react";
import { postBanter, replyBanter, suggestBanterReplies, toggleLike } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Avatar, Card, Empty, SfsuBadge } from "./ui";

export type BanterItem = {
  id: string;
  body: string;
  ago: string;
  author: { name: string; username: string; sfsu: boolean };
  likes: number;
  liked: boolean;
  replies: { id: string; body: string; ago: string; name: string; sfsu: boolean }[];
};

const PROMPTS = ["Best study spot on campus?", "Hot take:", "Overheard in the library...", "Who else is stressed about midterms?"];

export function BanterBoard({ items, me, sort }: { items: BanterItem[]; me: string; sort: "new" | "hot" }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const r = await postBanter(text);
      if (r.error) return setErr(r.error);
      setErr(undefined);
      setText("");
    });

  return (
    <div>
      <Card className="mb-5 border-2 border-primary/30 p-4">
        <div className="flex gap-3">
          <Avatar name={me} />
          <div className="flex-1">
            <textarea
              value={text}
              maxLength={280}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) submit(); }}
              placeholder="What's on your mind?"
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {!text && PROMPTS.map((p) => (
                <button key={p} onClick={() => setText(p + " ")} className="cursor-pointer rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary transition hover:bg-primary/20 active:scale-95">{p}</button>
              ))}
              <span className={cn("ml-auto text-xs", text.length > 250 ? "text-destructive" : "text-muted-foreground")}>{text.length > 0 && `${280 - text.length}`}</span>
              <button
                onClick={submit}
                disabled={pending || !text.trim()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Post
              </button>
            </div>
            {err && <p role="alert" className="animate-pop mt-2 text-sm text-destructive">{err}</p>}
          </div>
        </div>
      </Card>

      <div className="mb-4 inline-flex rounded-xl border bg-card p-1 text-sm">
        <Link href="/banter" className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium", sort === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><Clock className="size-3.5" />New</Link>
        <Link href="/banter?sort=hot" className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium", sort === "hot" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><Flame className="size-3.5" />Hot</Link>
      </div>

      {items.length === 0 ? (
        <Empty icon={MessageCircle}>It&apos;s quiet in here. Say something!</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((b, i) => <BanterCard key={b.id} b={b} i={i} />)}
        </div>
      )}
    </div>
  );
}

function BanterCard({ b, i }: { b: BanterItem; i: number }) {
  const [open, setOpen] = useState(b.replies.length > 0 && b.replies.length <= 2);
  const [reply, setReply] = useState("");
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const [like, setLike] = useOptimistic({ liked: b.liked, count: b.likes });
  const [ideas, setIdeas] = useState<string[]>([]);
  const [thinking, startThink] = useTransition();

  const sendReply = () =>
    start(async () => {
      const r = await replyBanter(b.id, reply);
      if (r.error) return setErr(r.error);
      setErr(undefined);
      setReply("");
    });

  return (
    <Card className="animate-fade-up p-4 transition hover:border-primary/40" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div className="flex gap-3">
        <Avatar name={b.author.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold">{b.author.name}</span>
            {b.author.sfsu && <SfsuBadge />}
            <span className="text-muted-foreground">· {b.ago}</span>
          </div>
          <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{b.body}</p>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <button
              onClick={() => start(async () => { setLike({ liked: !like.liked, count: like.count + (like.liked ? -1 : 1) }); await toggleLike(b.id); })}
              className={cn("flex cursor-pointer items-center gap-1 transition active:scale-90", like.liked ? "text-primary" : "hover:text-primary")}
            >
              <Heart className={cn("size-4 transition", like.liked && "fill-primary")} />{like.count > 0 && like.count}
            </button>
            <button onClick={() => setOpen(!open)} className="flex cursor-pointer items-center gap-1 transition hover:text-primary">
              <MessageCircle className="size-4" />{b.replies.length > 0 ? `${b.replies.length} repl${b.replies.length === 1 ? "y" : "ies"}` : "Reply"}
            </button>
          </div>

          {open && (
            <div className="animate-fade-up mt-3 space-y-2 border-l-2 border-primary/20 pl-3">
              {b.replies.map((r) => (
                <div key={r.id} className="flex gap-2">
                  <Avatar name={r.name} size={24} />
                  <div className="min-w-0 rounded-xl bg-muted/60 px-3 py-1.5 text-sm">
                    <span className="font-semibold">{r.name}</span> {r.sfsu && <SfsuBadge />} <span className="text-xs text-muted-foreground">{r.ago}</span>
                    <p className="break-words">{r.body}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendReply(); }} className="flex gap-2 pt-1">
                <input
                  value={reply}
                  maxLength={280}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply"
                  autoFocus={b.replies.length === 0}
                  className="flex-1 rounded-full border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button disabled={pending || !reply.trim()} className="cursor-pointer rounded-full bg-primary p-2 text-primary-foreground transition active:scale-90 disabled:opacity-50" aria-label="Send reply">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={thinking}
                  onClick={() => startThink(async () => setIdeas(await suggestBanterReplies(b.id, ideas.length > 0)))}
                  className="flex cursor-pointer items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20 active:scale-95 disabled:opacity-60"
                >
                  {thinking ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{ideas.length ? "More ideas" : "Suggest a reply"}
                </button>
                {ideas.map((t) => (
                  <button key={t} type="button" onClick={() => setReply(t)} className="animate-pop cursor-pointer rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs transition hover:border-primary active:scale-95">
                    {t}
                  </button>
                ))}
              </div>
              {err && <p role="alert" className="animate-pop text-sm text-destructive">{err}</p>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
