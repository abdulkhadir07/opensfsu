import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...p }: ComponentProps<"button"> & { variant?: "primary" | "outline" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "outline" && "border bg-card hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "border border-destructive/40 text-destructive hover:bg-destructive/10",
        className,
      )}
      {...p}
    />
  );
}

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cn("w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40", className)} {...p} />;
}

export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn("w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40", className)} {...p} />;
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cn("w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40", className)} {...p} />;
}

export function Label({ children, ...p }: ComponentProps<"label">) {
  return <label className="mb-1 block text-xs font-medium text-muted-foreground" {...p}>{children}</label>;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border bg-card p-5", className)} {...p} />;
}

const GRADIENTS = [
  ["#7c3aed", "#c084fc"],
  ["#f59e0b", "#f97316"],
  ["#0ea5e9", "#6366f1"],
  ["#10b981", "#06b6d4"],
  ["#ec4899", "#f43f5e"],
  ["#8b5cf6", "#ec4899"],
];

export function Avatar({ name, size = 36, src }: { name: string; size?: number; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-card" style={{ width: size, height: size }} />;
  }
  const [a, b] = GRADIENTS[[...name].reduce((x, ch) => x + ch.charCodeAt(0), 0) % GRADIENTS.length];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-card"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function RepBadge({ rep }: { rep?: { avg: number; count: number } | null }) {
  if (!rep || !rep.count) return null;
  return (
    <span title={`${rep.avg} average from ${rep.count} rating${rep.count === 1 ? "" : "s"}`} className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-foreground dark:text-gold">
      ★{rep.avg.toFixed(1)}
    </span>
  );
}

export function SfsuBadge() {
  return <span className="rounded-md bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-foreground dark:text-gold">SFSU</span>;
}

export function Empty({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
      <Icon className="size-6" />
      <p>{children}</p>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="mb-5 inline-flex rounded-xl border bg-card p-1">
      {items.map((t) => (
        <a key={t.key} href={t.href} className={cn("rounded-lg px-4 py-1.5 text-sm font-medium", t.key === active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {t.label}
        </a>
      ))}
    </div>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-[30%] shadow-sm"
      style={{ width: size, height: size, background: "linear-gradient(135deg, var(--primary), #a855f7 55%, var(--gold))" }}
    >
      <span className="rounded-full border-white" style={{ width: size * 0.48, height: size * 0.48, borderWidth: Math.max(2, size * 0.09) }} />
      <span className="absolute rounded-full bg-gold" style={{ width: size * 0.16, height: size * 0.16, top: size * 0.2, right: size * 0.2 }} />
    </span>
  );
}
