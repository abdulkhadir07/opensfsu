import { db } from "./db";

export type Rep = { avg: number; count: number; raters: number };

// Average rating, total ratings and distinct raters for each user
export async function reputation(userIds: string[]): Promise<Record<string, Rep>> {
  if (!userIds.length) return {};
  const rows = await db.rating.findMany({ where: { rateeId: { in: [...new Set(userIds)] } }, select: { rateeId: true, raterId: true, score: true } });
  const out: Record<string, Rep> = {};
  const raters: Record<string, Set<string>> = {};
  for (const r of rows) {
    const o = (out[r.rateeId] ??= { avg: 0, count: 0, raters: 0 });
    o.avg += r.score;
    o.count++;
    (raters[r.rateeId] ??= new Set()).add(r.raterId);
  }
  for (const [id, o] of Object.entries(out)) {
    o.avg = Math.round((o.avg / o.count) * 10) / 10;
    o.raters = raters[id].size;
  }
  return out;
}

export type Award = { icon: string; title: string; text: string };

export async function awards(userId: string, rep: Rep | undefined): Promise<Award[]> {
  const [hosted, meetups, top, banters] = await Promise.all([
    db.post.count({ where: { authorId: userId, status: "ACTIVE" } }),
    db.roomMember.count({ where: { userId } }),
    db.user.findMany({ orderBy: [{ points: "desc" }, { createdAt: "asc" }], take: 5, select: { id: true } }),
    db.banter.count({ where: { authorId: userId } }),
  ]);
  const list: Award[] = [];
  const rank = top.findIndex((u) => u.id === userId);
  if (rank >= 0) list.push({ icon: rank === 0 ? "👑" : "🏆", title: rank === 0 ? "#1 this season" : "Top 5 this season", text: `Ranked #${rank + 1} on the scoreboard` });
  if (hosted >= 1) list.push({ icon: "🎉", title: "First invite hosted", text: hosted === 1 ? "Hosted their first invite" : `Hosted ${hosted} invites` });
  if (meetups >= 5) list.push({ icon: "🤝", title: "5+ meetups", text: `Joined ${meetups} meetups` });
  else if (meetups >= 1) list.push({ icon: "👋", title: "First meetup", text: "Met up with someone new" });
  if (rep && rep.count >= 2 && rep.avg >= 4.5) list.push({ icon: "⭐", title: "Highly rated", text: `${rep.avg} average from ${rep.raters} people` });
  if (banters >= 3) list.push({ icon: "📣", title: "Banter regular", text: `${banters} Banter posts` });
  return list;
}

export function deviceName(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return `${browser} on ${os}`;
}
