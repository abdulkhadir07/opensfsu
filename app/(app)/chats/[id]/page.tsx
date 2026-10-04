import Link from "next/link";
import { notFound } from "next/navigation";
import { reputation } from "@/lib/profile";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { endChat } from "@/lib/actions";
import { displayName } from "@/lib/utils";
import { Button, RepBadge } from "@/components/ui";
import { ChatRoom } from "@/components/chat-room";

export default async function Room({ params }: PageProps<"/chats/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const room = await db.room.findFirst({
    where: { id, members: { some: { userId: user.id } } },
    include: { post: true, members: { include: { user: true } } },
  });
  if (!room) notFound();
  const others = room.members.filter((m) => m.userId !== user.id).map((m) => m.user);
  const reps = await reputation(others.map((u) => u.id));
  const people = Object.fromEntries(room.members.map((m) => [m.userId, { avatarUrl: m.user.avatarUrl, username: m.user.username }]));
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{room.post.title}</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            with{" "}
            {others.length ? others.map((u, i) => (
              <span key={u.id} className="flex items-center gap-1">
                <Link href={`/u/${u.username}`} className="font-medium text-foreground hover:underline">{displayName(u)}</Link>
                <RepBadge rep={reps[u.id]} />{i < others.length - 1 && ","}
              </span>
            )) : "your group"}
          </p>
        </div>
        {!room.closed && <form action={endChat.bind(null, room.id)}><Button variant="danger">End chat</Button></form>}
      </div>
      <ChatRoom roomId={room.id} me={user.id} closed={room.closed} people={people} />
    </div>
  );
}
