import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { displayName } from "@/lib/utils";
import { Logo, Avatar } from "@/components/ui";

export default async function Welcome() {
  if (await getUser()) redirect("/");
  const where = { status: "ACTIVE", expiresAt: { gt: new Date() } };
  const [count, latest] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({ where, orderBy: { createdAt: "desc" }, take: 3, include: { author: true } }),
  ]);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="animate-fade-up text-center">
          <Logo size={56} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight">OpenSFSU</h1>
          <p className="mt-2 text-muted-foreground">Find people at SFSU to study, eat and hang out with today.</p>
        </div>
        <div className="mt-8 flex animate-fade-up flex-col gap-3 sm:flex-row" style={{ animationDelay: "80ms" }}>
          <Link href="/signup" className="flex-1 rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95">Create an account</Link>
          <Link href="/login" className="flex-1 rounded-lg border bg-card px-4 py-3 text-center text-sm font-semibold transition hover:bg-muted active:scale-95">Log in</Link>
        </div>
        {latest.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>
              {count} invite{count === 1 ? "" : "s"} open right now
            </p>
            <div className="space-y-2">
              {latest.map((p, i) => (
                <div key={p.id} className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: `${160 + i * 80}ms` }}>
                  <Avatar name={displayName(p.author)} src={p.author.avatarUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.title}</div>
                    <div className="flex gap-3 truncate text-xs text-muted-foreground">
                      {p.place && <span className="flex items-center gap-1"><MapPin className="size-3" />{p.place}</span>}
                      {p.startsAt && <span className="flex items-center gap-1"><Clock className="size-3" />{p.startsAt}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Sign up to see them all and ask to join.</p>
          </div>
        )}
      </div>
    </main>
  );
}
