"use client";

import { useState, useTransition } from "react";
import { respondRequest } from "@/lib/actions";
import { Button } from "./ui";

export function RespondButtons({ id }: { id: string }) {
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const go = (accept: boolean) => start(async () => setErr((await respondRequest(id, accept))?.error));
  return (
    <div className="flex items-center gap-2">
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
      <Button disabled={pending} onClick={() => go(true)}>Accept</Button>
      <Button disabled={pending} variant="outline" onClick={() => go(false)}>Decline</Button>
    </div>
  );
}
