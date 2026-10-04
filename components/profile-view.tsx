import Link from "next/link";
import { CalendarDays, MessageCircle, Star, Trophy, Users } from "lucide-react";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { awards, reputation } from "@/lib/profile";
import { displayName, isSfsu, splitTags, timeLeft } from "@/lib/utils";
import { Avatar, Card, Empty, SfsuBadge } from "./ui";
import { AvatarMenu } from "./avatar-menu";
import { ProfileEditor } from "./profile-editor";

export async function ProfileView({ user, mine }: { user: User; mine: boolean }) {
  const rep = (await reputation([user.id]))[user.id];
  const [list, invites] = await Promise.all([
    awards(user.id, rep),
    db.post.findMany({ where: { authorId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const name = displayName(user);
  const since = user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const interests = splitTags(user.interests);

  const badges = (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>@{user.username}</span>
      {isSfsu(user.email) && <SfsuBadge />}
      <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />Member since {since}</span>
    </div>
  );

  const stats = [
    { icon: Star, label: "Rating", value: rep ? `★ ${rep.avg.toFixed(1)}` : "New", sub: rep ? `${rep.count} rating${rep.count === 1 ? "" : "s"}` : "No ratings yet" },
    { icon: Users, label: "Rated by", value: rep ? String(rep.raters) : "0", sub: rep?.raters === 1 ? "person" : "people" },
    { icon: Trophy, label: "Points", value: String(user.points), sub: "this season" },
  ];

  return (
    <div className="space-y-5">
      <Card className="animate-fade-up overflow-visible p-0">
        <div className="h-24 rounded-t-2xl bg-gradient-to-r from-primary via-[#a855f7] to-gold" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-start">
          <div className="-mt-12 rounded-full ring-4 ring-card">
            {mine ? <AvatarMenu name={name} src={user.avatarUrl} size={96} /> : <Avatar name={name} src={user.avatarUrl} size={96} />}
          </div>
          <div className="min-w-0 flex-1 sm:pt-3">
            {mine ? (
              <ProfileEditor initial={{ firstName: user.firstName, lastName: user.lastName, bio: user.bio ?? "", interests }} badges={badges} />
            ) : (
              <>
                <h1 className="text-[28px] font-extrabold tracking-tight">{name}</h1>
                {badges}
                <p className={`mt-3 text-[15px] leading-relaxed ${user.bio ? "" : "text-muted-foreground italic"}`}>{user.bio || "No bio yet."}</p>
                {interests.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {interests.map((t) => <span key={t} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">#{t}</span>)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, label, value, sub }, i) => (
          <Card key={label} className="animate-fade-up p-4" style={{ animationDelay: `${60 + i * 60}ms` }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Icon className="size-3.5" />{label}</div>
            <div className="mt-1 text-2xl font-extrabold text-primary">{value}</div>
            <div className="text-xs text-muted-foreground">{sub}</div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">Awards</h2>
        {list.length === 0 ? (
          <Empty icon={Trophy}>{mine ? "No awards yet. Host or join an invite to earn your first one." : "No awards yet."}</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((a, i) => (
              <Card key={a.title} className="animate-fade-up flex items-center gap-3 p-4" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-gold/25 text-xl">{a.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.text}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">{mine ? "Your open invites" : `${user.firstName}'s open invites`}</h2>
        {invites.length === 0 ? (
          <Empty icon={MessageCircle}>{mine ? <>Nothing open right now. <Link href="/new" className="font-medium text-primary hover:underline">Start an invite</Link></> : "Nothing open right now."}</Empty>
        ) : (
          <div className="space-y-2">
            {invites.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{[p.place, p.startsAt].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{timeLeft(p.expiresAt)}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
