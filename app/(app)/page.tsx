import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { feedInsights } from "@/lib/ai";
import { reputation } from "@/lib/profile";
import { displayName, isSfsu, splitTags, timeLeft } from "@/lib/utils";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Avatar, PageHeader } from "@/components/ui";
import { Feed, type FeedPost } from "@/components/feed";

const IDEAS = [
  { label: "📚 Study session", text: "Looking for 3 people to study at the library around 4pm" },
  { label: "🍜 Grab food", text: "Anyone want to grab lunch at Cesar Chavez Student Center at noon? 2 people" },
  { label: "⚽ Pickup game", text: "Need 4 players for pickup soccer at Cox Stadium at 5pm" },
  { label: "☕ Coffee chat", text: "Coffee and chill at the student center after class at 3pm, 1 person" },
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" }).format(new Date()));
  return h < 12 ? "Morning" : h < 18 ? "Hey" : "Evening";
}

export default async function Home() {
  const user = await requireUser();
  const now = new Date();
  const posts = await db.post.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    include: { author: true, requests: true },
  });
  const interests = splitTags(user.interests);
  const reps = await reputation(posts.map((p) => p.authorId));
  const items: FeedPost[] = posts.map((p) => {
    const tags = splitTags(p.tags);
    const mine = p.requests.find((r) => r.userId === user.id && r.status !== "WITHDRAWN");
    return {
      id: p.id, title: p.title, content: p.content, place: p.place, startsAt: p.startsAt, type: p.type, capacity: p.capacity,
      accepted: p.requests.filter((r) => r.status === "ACCEPTED").length, tags, timeLeft: timeLeft(p.expiresAt),
      urgent: p.expiresAt.getTime() - now.getTime() < 3 * 3600 * 1000,
      author: { name: displayName(p.author), username: p.author.username, sfsu: isSfsu(p.author.email), avatarUrl: p.author.avatarUrl, rep: reps[p.authorId] ?? null },
      mine: p.authorId === user.id, myStatus: mine?.status ?? null,
      why: null,
    };
  });
  const insights = await feedInsights(
    items.map((p) => ({ id: p.id, title: p.title, tags: p.tags, place: p.place, startsAt: p.startsAt, mine: p.mine })),
    { firstName: user.firstName, interests, bio: user.bio },
  );
  for (const p of items) p.why = insights.reasons[p.id] ?? null;

  return (
    <div>
      <PageHeader title={`${greeting()}, ${user.firstName} 👋`} sub={items.length ? `${items.length} open invite${items.length === 1 ? "" : "s"} on campus right now. Jump in.` : "What are you up to today?"} />
      <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm">
        <Link href="/new" className="group flex items-center gap-3">
          <Avatar name={displayName(user)} src={user.avatarUrl} />
          <span className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm text-muted-foreground transition group-hover:border-primary/50">What do you want to do today, {user.firstName}?</span>
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition group-hover:scale-110"><Plus className="size-5" /></span>
        </Link>
        <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
          {IDEAS.map((i) => (
            <Link key={i.label} href={`/new?text=${encodeURIComponent(i.text)}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20 active:scale-95">{i.label}</Link>
          ))}
        </div>
      </div>
      <div className="animate-fade-up mb-6 flex gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-gold/10 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-4.5" /></span>
        <div>
          <div className="text-xs font-semibold tracking-wide text-primary uppercase">{insights.ai ? "Your AI campus digest" : "Today on campus"}</div>
          <p className="mt-0.5 text-[15px] leading-relaxed">{insights.digest}</p>
        </div>
      </div>
      <Feed posts={items} />
    </div>
  );
}
