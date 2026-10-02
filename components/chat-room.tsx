"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SendHorizontal, Lock, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { askIcebreaker, sendMessage, suggestChatReplies } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Avatar, Button, Input } from "./ui";

type Msg = { id: string; body: string; userId: string; name: string; at: string; ai: boolean };

export function ChatRoom({ roomId, me, closed: initialClosed }: { roomId: string; me: string; closed: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [closed, setClosed] = useState(initialClosed);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [breaking, startBreak] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const lastSuggestedFor = useRef<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/rooms/${roomId}/messages`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setMsgs(data.messages);
    setClosed(data.closed);
  };

  const suggest = async (force = false) => {
    const last = msgs.at(-1);
    const key = last?.id ?? "empty";
    if (!force && lastSuggestedFor.current === key) return;
    lastSuggestedFor.current = key;
    setThinking(true);
    try {
      setSuggestions(await suggestChatReplies(roomId, force));
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 3000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    // refresh AI suggestions whenever someone else speaks
    const last = msgs.at(-1);
    if (!closed && msgs.length && last && last.userId !== me) {
      const t = setTimeout(() => suggest(), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length]);

  const send = (e?: React.FormEvent, quick?: string) => {
    e?.preventDefault();
    const body = quick ?? text;
    start(async () => {
      const r = await sendMessage(roomId, body);
      if (r.error) return setErr(r.error);
      setErr(undefined);
      setText("");
      setSuggestions([]);
      await load();
    });
  };

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hi 👋 and keep plans in public places.</p>}
        {msgs.map((m) => {
          if (m.ai) {
            return (
              <div key={m.id} className="animate-fade-up mx-auto max-w-[90%] rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary"><Sparkles className="size-3.5" />OpenSFSU AI · icebreaker</div>
                {m.body}
              </div>
            );
          }
          const mine = m.userId === me;
          return (
            <div key={m.id} className={cn("animate-fade-up flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && <Avatar name={m.name} size={28} />}
              <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card")}>
                {!mine && <div className="mb-0.5 text-xs font-semibold opacity-70">{m.name.split(" ")[0]}</div>}
                {m.body}
                <div className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {closed ? (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground"><Lock className="size-4" />This chat has ended. Go to Ratings to rate your group.</p>
      ) : (
        <form onSubmit={send} className="mt-4 space-y-2">
          {err && <p role="alert" className="animate-pop text-sm text-destructive">{err}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Sparkles className="size-3.5" />AI replies</span>
            {thinking ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />thinking...</span>
            ) : suggestions.length ? (
              suggestions.map((q) => (
                <button key={q} type="button" disabled={pending} onClick={() => setText(q)} className="animate-pop cursor-pointer rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs transition hover:border-primary hover:bg-primary/10 active:scale-95">
                  {q}
                </button>
              ))
            ) : (
              <button type="button" onClick={() => suggest(true)} className="cursor-pointer rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">Suggest replies</button>
            )}
            {suggestions.length > 0 && !thinking && (
              <button type="button" onClick={() => suggest(true)} aria-label="New suggestions" className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-primary"><RefreshCw className="size-3.5" /></button>
            )}
            <button
              type="button"
              disabled={breaking}
              onClick={() => startBreak(async () => { await askIcebreaker(roomId); await load(); })}
              className="ml-auto flex cursor-pointer items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20 active:scale-95 disabled:opacity-60"
            >
              {breaking ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}Icebreaker
            </button>
          </div>
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
            <Button disabled={pending || !text.trim()}><SendHorizontal className="size-4" /></Button>
          </div>
        </form>
      )}
    </>
  );
}
