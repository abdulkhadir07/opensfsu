import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { displayName } from "@/lib/utils";
import { Avatar, Card, Empty, PageHeader } from "@/components/ui";

export default async function Chats() {
  const user = await requireUser();
  const rooms = await db.room.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { post: true, members: { include: { user: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Chats" sub="Plan the details with your group." />
      {rooms.length === 0 ? (
        <Empty icon={MessageCircle}>No chats yet. Once someone accepts you, it shows up here.</Empty>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => {
            const others = r.members.filter((m) => m.userId !== user.id).map((m) => displayName(m.user));
            const last = r.messages[0];
            return (
              <Link key={r.id} href={`/chats/${r.id}`} className="block">
                <Card className="flex items-center gap-3 p-4 transition hover:border-primary/50">
                  <Avatar name={others[0] ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.post.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{others.join(", ")}{last ? ` · ${last.body}` : ""}</div>
                  </div>
                  {r.closed && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">ended</span>}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
