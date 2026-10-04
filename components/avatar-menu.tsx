"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { setAvatar } from "@/lib/actions";
import { Avatar } from "./ui";

// Shrink the picked photo to a 256px square JPEG so it fits in the database as a data URL
function resize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = URL.createObjectURL(file);
  });
}

export function AvatarMenu({ name, src, size = 36, align = "left" }: { name: string; src: string | null; size?: number; align?: "left" | "center" }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (file?: File) => {
    setOpen(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setErr("Use a JPEG, PNG or WebP photo");
    if (file.size > 5 * 1024 * 1024) return setErr("That photo is over 5 MB");
    start(async () => {
      try {
        const r = await setAvatar(await resize(file));
        setErr(r.error);
        router.refresh();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  };

  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Change profile photo" className="group relative block cursor-pointer rounded-full">
        <Avatar name={name} src={src} size={size} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
          {pending ? <Loader2 className="size-1/3 animate-spin" /> : <Camera className="size-1/3" />}
        </span>
      </button>
      {open && (
        <div className={`animate-pop absolute top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border bg-card text-sm shadow-lg ${align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}`}>
          <button type="button" onClick={() => input.current?.click()} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left hover:bg-muted">
            <Upload className="size-4" />{src ? "Change photo" : "Upload photo"}
          </button>
          {src && (
            <button
              type="button"
              onClick={() => { setOpen(false); start(async () => { await setAvatar(null); router.refresh(); }); }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-destructive hover:bg-muted"
            >
              <Trash2 className="size-4" />Remove photo
            </button>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <p role="alert" className="absolute top-full left-0 z-20 mt-1 w-56 text-xs text-destructive">{err}</p>}
    </div>
  );
}
