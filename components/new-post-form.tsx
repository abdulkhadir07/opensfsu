"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Sparkles, ShieldAlert, Pencil } from "lucide-react";
import { createPost, draftPost } from "@/lib/actions";
import { Button, Card, Input, Label, Select, Textarea } from "./ui";

type Fields = { title: string; type: string; capacity: string; scope: string; place: string; startsAt: string; tags: string };
const EXAMPLES = [
  "Anyone want to study for CSC 413 at the library around 4pm? Looking for 3 people",
  "Getting boba near campus after my 2pm class, 1 person",
  "Need 4 more players for pickup basketball at the gym at 6pm",
  "Walk around the quad after class at 5pm, 2 or 3 people",
];

const SPOTS = ["J. Paul Leonard Library", "Cesar Chavez Student Center", "Mashouf Wellness Center", "Cox Stadium", "The Quad", "Village at Centennial Square", "Humanities Building", "Thornton Hall", "Science Building", "Creative Arts Building"];

const EMPTY: Fields = { title: "", type: "GROUP", capacity: "3", scope: "CAMPUS", place: "", startsAt: "", tags: "" };

export function NewPostForm({ initialText = "" }: { initialText?: string }) {
  const [content, setContent] = useState(initialText);
  const [f, setF] = useState<Fields | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [drafting, startDraft] = useTransition();
  const [state, action, pending] = useActionState(createPost, undefined);
  const [editing, setEditing] = useState(false);
  const held = state?.held && !editing ? state.held : null;

  const draft = () =>
    startDraft(async () => {
      const d = await draftPost(content);
      if (!d) return;
      setF({ title: d.title, type: d.type, capacity: String(d.capacity), scope: d.scope, place: d.place ?? "", startsAt: d.startsAt ?? "", tags: d.tags.join(", ") });
      setAiNote(d.ai ? "Drafted by AI. Give it a quick look before posting." : "Drafted for you. Give it a quick look before posting.");
      setEditing(false);
    });

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => setF((x) => ({ ...(x ?? EMPTY), [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <Card>
        <Label htmlFor="describe">Describe your invite</Label>
        <Textarea id="describe" rows={4} maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What do you want to do, where, and when?" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Need ideas? Tap one:</span>
          <span className={content.length > 400 ? "text-destructive" : ""}>{content.length}/500</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setContent(ex)}
              className="cursor-pointer rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground active:scale-95"
            >
              {ex.length > 42 ? ex.slice(0, 40) + "..." : ex}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={draft} disabled={drafting || !content.trim()}><Sparkles className="size-4" />{drafting ? "Writing it up..." : "Draft with AI"}</Button>
          {!f && <Button type="button" variant="ghost" onClick={() => setF(EMPTY)}>Fill manually</Button>}
        </div>
      </Card>

      {held && (
        <div role="alert" className="animate-pop flex items-start gap-3 rounded-2xl border border-amber-foreground/30 bg-amber p-4 text-amber-foreground">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Held by Safety Guardian: {held.reason}</p>
            <p className="text-sm opacity-80">Nobody can see it yet. Fix it up and post again.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</Button>
        </div>
      )}

      {f && (
        <Card className="animate-fade-up">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setEditing(false);
              startTransition(() => action(fd));
            }}
            className="space-y-3"
          >
            {aiNote && <p className="flex items-center gap-1.5 text-xs text-primary"><Sparkles className="size-3.5" />{aiNote}</p>}
            <input type="hidden" name="content" value={content} />
            <input type="hidden" name="editId" value={state?.held?.id ?? ""} />
            <div><Label htmlFor="title">Title</Label><Input id="title" name="title" value={f.title} onChange={set("title")} required /></div>
            <input type="hidden" name="scope" value="CAMPUS" />
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="type">Type</Label><Select id="type" name="type" value={f.type} onChange={set("type")}><option value="SINGLE">1:1</option><option value="GROUP">Group</option></Select></div>
              <div><Label htmlFor="capacity">Spots</Label><Input id="capacity" name="capacity" type="number" min={1} max={50} value={f.capacity} onChange={set("capacity")} /></div>
            </div>
            <PlacePicker value={f.place} onChange={(v) => setF((x) => ({ ...(x ?? EMPTY), place: v }))} />
            <div><Label htmlFor="startsAt">Time</Label><Input id="startsAt" name="startsAt" value={f.startsAt} onChange={set("startsAt")} /></div>
            <div><Label htmlFor="tags">Tags (comma separated)</Label><Input id="tags" name="tags" value={f.tags} onChange={set("tags")} /></div>
            {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            <Button disabled={pending} className="w-full">{pending ? "Running a quick safety check..." : "Post invite"}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function PlacePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = SPOTS.includes(value);
  const [customMode, setCustom] = useState(false);
  const custom = customMode || (!!value && !isPreset);
  const chip = (active: boolean) =>
    `cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"}`;
  return (
    <div>
      <Label>Where</Label>
      <input type="hidden" name="place" value={value} />
      <div className="flex flex-wrap gap-1.5">
        {SPOTS.map((s) => (
          <button key={s} type="button" onClick={() => { setCustom(false); onChange(value === s ? "" : s); }} className={chip(!custom && value === s)}>
            {s}
          </button>
        ))}
        <button type="button" onClick={() => { setCustom(true); if (isPreset) onChange(""); }} className={chip(custom)}>
          <Pencil className="mr-1 inline size-3" />Somewhere else
        </button>
      </div>
      {custom && (
        <Input
          autoFocus
          className="animate-fade-up mt-2"
          placeholder="Type your spot, e.g. the benches outside Burk Hall"
          value={value}
          maxLength={120}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
