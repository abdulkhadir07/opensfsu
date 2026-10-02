import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { AI_MARK } from "@/lib/utils";

export async function GET(_: Request, ctx: RouteContext<"/api/rooms/[id]/messages">) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const room = await db.room.findFirst({ where: { id, members: { some: { userId: user.id } } } });
  if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
  const messages = await db.message.findMany({
    where: { roomId: id, flagged: false },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  return NextResponse.json({
    closed: room.closed,
    messages: messages.map((m) => ({ id: m.id, body: m.body, userId: m.userId, name: `${m.user.firstName} ${m.user.lastName}`, at: m.createdAt, ai: m.flagReason === AI_MARK })),
  });
}
