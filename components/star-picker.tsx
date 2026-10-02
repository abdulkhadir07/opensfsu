"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { rate } from "@/lib/actions";
import { cn } from "@/lib/utils";

const LABELS = ["", "Not great", "Okay", "Good", "Really good", "Amazing!"];

export function StarPicker({ roomId, rateeId }: { roomId: string; rateeId: string }) {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const [pending, start] = useTransition();
  const shown = picked || hover;

  if (picked && !pending) {
    return <span className="animate-pop rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">Thanks! +3 pts</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden w-20 text-right text-xs font-medium text-muted-foreground sm:block">{LABELS[shown]}</span>
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            disabled={pending}
            title={LABELS[s]}
            onMouseEnter={() => setHover(s)}
            onClick={() => { setPicked(s); start(() => rate(roomId, rateeId, s)); }}
            className="cursor-pointer p-0.5 transition active:scale-90"
          >
            <Star className={cn("size-7 transition", s <= shown ? "scale-110 fill-primary text-primary" : "text-primary/30")} />
          </button>
        ))}
      </div>
    </div>
  );
}
