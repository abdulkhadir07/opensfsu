import { Trophy, Crown } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { displayName, isSfsu } from "@/lib/utils";
import { Avatar, Card, PageHeader, SfsuBadge } from "@/components/ui";

export default async function Scoreboard() {
  const user = await requireUser();
  const top = await db.user.findMany({ orderBy: [{ points: "desc" }, { createdAt: "asc" }], take: 5 });
  const rank = (await db.user.count({ where: { points: { gt: user.points } } })) + 1;
  const podium = [top[1], top[0], top[2]];
  return (
    <div>
      <PageHeader title="Scoreboard" sub="Host, join and rate people to climb the board." />
      <Card className="mb-6 flex items-center gap-4 bg-primary text-primary-foreground">
        <Trophy className="size-8" />
        <div className="flex-1">
          <div className="text-sm opacity-80">Your points</div>
          <div className="text-3xl font-bold">{user.points}</div>
        </div>
        <div className="text-right"><div className="text-sm opacity-80">Rank</div><div className="text-2xl font-bold">#{rank}</div></div>
      </Card>
      <div className="mb-4 grid grid-cols-3 items-end gap-3">
        {podium.map((u, i) => {
          if (!u) return <div key={i} />;
          const place = i === 1 ? 1 : i === 0 ? 2 : 3;
          return (
            <Card key={u.id} className={`flex flex-col items-center gap-2 p-4 text-center ${place === 1 ? "border-primary pb-8" : ""} ${u.id === user.id ? "ring-2 ring-primary" : ""}`}>
              {place === 1 ? <Crown className="size-5 text-primary" /> : <span className="text-sm font-bold text-muted-foreground">#{place}</span>}
              <Avatar name={displayName(u)} size={place === 1 ? 56 : 44} />
              <div className="flex items-center gap-1 text-sm font-semibold">{u.firstName} {isSfsu(u.email) && <SfsuBadge />}</div>
              <div className="text-lg font-bold text-primary">{u.points}</div>
            </Card>
          );
        })}
      </div>
      <div className="space-y-2">
        {top.slice(3).map((u, i) => (
          <Card key={u.id} className={`flex items-center gap-3 p-3 ${u.id === user.id ? "ring-2 ring-primary" : ""}`}>
            <span className="w-6 text-center font-bold text-muted-foreground">{i + 4}</span>
            <Avatar name={displayName(u)} size={32} />
            <span className="flex-1 text-sm font-semibold">{displayName(u)}</span>
            <span className="font-bold text-primary">{u.points}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
