import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { endChat } from "@/lib/actions";
import { displayName } from "@/lib/utils";
import { Button } from "@/components/ui";
import { ChatRoom } from "@/components/chat-room";

export default async function Room({ params }: PageProps<"/chats/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const room = await db.room.findFirst({
    where: { id, members: { some: { userId: user.id } } },
    include: { post: true, members: { include: { user: true } } },
  });
  if (!room) notFound();
  const others = room.members.filter((m) => m.userId !== user.id).map((m) => displayName(m.user));
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{room.post.title}</h1>
          <p className="truncate text-sm text-muted-foreground">with {others.join(", ") || "your group"}</p>
        </div>
        {!room.closed && <form action={endChat.bind(null, room.id)}><Button variant="danger">End chat</Button></form>}
      </div>
      <ChatRoom roomId={room.id} me={user.id} closed={room.closed} />
    </div>
  );
}
