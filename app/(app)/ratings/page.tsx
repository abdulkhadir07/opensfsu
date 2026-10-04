import Link from "next/link";
import { Star, StarOff, EyeOff } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StarPicker } from "@/components/star-picker";
import { displayName } from "@/lib/utils";
import { Avatar, Card, Empty, PageHeader, Tabs } from "@/components/ui";

export default async function Ratings({ searchParams }: PageProps<"/ratings">) {
  const user = await requireUser();
  const tab = (await searchParams).tab === "received" ? "received" : "due";

  const rooms = await db.room.findMany({
    where: { closed: true, members: { some: { userId: user.id } } },
    include: { post: true, members: { include: { user: true } }, ratings: true },
  });
  const due = rooms.flatMap((r) =>
    r.members
      .filter((m) => m.userId !== user.id && !r.ratings.some((x) => x.raterId === user.id && x.rateeId === m.userId))
      .map((m) => ({ room: r, ratee: m.user })),
  );

  const received = await db.rating.findMany({ where: { rateeId: user.id }, include: { room: { include: { ratings: true } } } });
  // eslint-disable-next-line react-hooks/purity -- server component, runs per request
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const revealed = received.filter(
    (r) => r.room.ratings.some((x) => x.raterId === user.id && x.rateeId === r.raterId) || (r.room.closedAt && r.room.closedAt.getTime() < dayAgo),
  );
  const avg = revealed.length ? revealed.reduce((a, r) => a + r.score, 0) / revealed.length : 0;

  return (
    <div>
      <PageHeader title="Ratings" sub="How did it go? You get 3 points for every rating you give." />
      <Tabs active={tab} items={[{ key: "due", href: "/ratings", label: `Due (${due.length})` }, { key: "received", href: "/ratings?tab=received", label: "Received" }]} />
      {tab === "due" ? (
        due.length === 0 ? (
          <Empty icon={StarOff}>Nothing to rate yet. Finish a hangout and come back.</Empty>
        ) : (
          <div className="space-y-3">
            {due.map(({ room, ratee }) => (
              <Card key={room.id + ratee.id} className="animate-fade-up flex flex-wrap items-center gap-3 p-4">
                <Link href={`/u/${ratee.username}`}><Avatar name={displayName(ratee)} src={ratee.avatarUrl} /></Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${ratee.username}`} className="text-sm font-semibold hover:underline">{displayName(ratee)}</Link>
                  <div className="truncate text-xs text-muted-foreground">{room.post.title}</div>
                </div>
                <StarPicker roomId={room.id} rateeId={ratee.id} />
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{revealed.length ? avg.toFixed(1) : "0.0"}</div>
            <div className="mt-1 flex justify-center">
              {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`size-4 ${s <= Math.round(avg) ? "fill-primary text-primary" : "text-primary/30"}`} />)}
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">{revealed.length} rating{revealed.length === 1 ? "" : "s"} received</p>
            {received.length > revealed.length && (
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><EyeOff className="size-4" />{received.length - revealed.length} hidden until you rate them back</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
