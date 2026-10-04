"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { updateProfile } from "@/lib/actions";

type P = { firstName: string; lastName: string; bio: string; interests: string[] };

// Name, bio and interests on your own profile: click to edit in place, then save
export function ProfileEditor({ initial, badges }: { initial: P; badges: React.ReactNode }) {
  const [p, setP] = useState(initial);
  const [editing, setEditing] = useState<null | "name" | "bio">(null);
  const [tag, setTag] = useState("");
  const [err, setErr] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = (next = p) =>
    start(async () => {
      const r = await updateProfile(next);
      setErr(r.error);
      if (!r.error) {
        setEditing(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    });

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (!t || p.interests.includes(t) || p.interests.length >= 12) return setTag("");
    const next = { ...p, interests: [...p.interests, t] };
    setP(next);
    setTag("");
    save(next);
  };
  const removeTag = (t: string) => {
    const next = { ...p, interests: p.interests.filter((x) => x !== t) };
    setP(next);
    save(next);
  };

  return (
    <div className="min-w-0 flex-1">
      {editing === "name" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input autoFocus value={p.firstName} onChange={(e) => setP({ ...p, firstName: e.target.value })} className="w-32 rounded-lg border bg-card px-2 py-1 text-xl font-bold outline-none focus:ring-2 focus:ring-primary/40" aria-label="First name" />
          <input value={p.lastName} onChange={(e) => setP({ ...p, lastName: e.target.value })} onKeyDown={(e) => e.key === "Enter" && save()} className="w-32 rounded-lg border bg-card px-2 py-1 text-xl font-bold outline-none focus:ring-2 focus:ring-primary/40" aria-label="Last name" />
          <button onClick={() => save()} disabled={pending} className="cursor-pointer rounded-lg bg-primary p-2 text-primary-foreground" aria-label="Save name">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}</button>
          <button onClick={() => { setP(initial); setEditing(null); }} className="cursor-pointer rounded-lg border p-2" aria-label="Cancel"><X className="size-4" /></button>
        </div>
      ) : (
        <button onClick={() => setEditing("name")} className="group flex cursor-pointer items-center gap-2 text-left" title="Click to edit your name">
          <h1 className="text-[28px] font-extrabold tracking-tight">{p.firstName} {p.lastName}</h1>
          <Pencil className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </button>
      )}
      {badges}

      <div className="mt-3">
        {editing === "bio" ? (
          <div>
            <textarea autoFocus rows={3} maxLength={200} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} placeholder="Major, year, what you're into..." className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => save()} disabled={pending} className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">{pending ? "Saving..." : "Save bio"}</button>
              <button onClick={() => { setP({ ...p, bio: initial.bio }); setEditing(null); }} className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
              <span className="ml-auto text-xs text-muted-foreground">{p.bio.length}/200</span>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing("bio")} className="group flex w-full cursor-pointer items-start gap-2 rounded-lg text-left" title="Click to edit your bio">
            <p className={p.bio ? "text-[15px] leading-relaxed" : "text-[15px] text-muted-foreground italic"}>{p.bio || "Add a short bio so people know who you are"}</p>
            <Pencil className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Interests</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {p.interests.map((t) => (
            <span key={t} className="animate-pop flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1.5 pl-3 text-xs font-medium text-primary">
              #{t}
              <button onClick={() => removeTag(t)} aria-label={`Remove ${t}`} className="cursor-pointer rounded-full p-0.5 hover:bg-primary/20"><X className="size-3" /></button>
            </span>
          ))}
          <input
            value={tag}
            onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value.slice(0, -1)) : setTag(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tag); } }}
            placeholder={p.interests.length ? "Add more..." : "Type an interest and press Enter"}
            className="min-w-40 flex-1 rounded-full border bg-card px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Your interests power the AI digest and the &quot;why this fits you&quot; lines on your feed.</p>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      {saved && <p className="animate-pop mt-2 text-sm text-primary">Saved ✓</p>}
    </div>
  );
}
