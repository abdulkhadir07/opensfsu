import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ago, displayName, isSfsu } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { BanterBoard, type BanterItem } from "@/components/banter";

export default async function BanterPage({ searchParams }: PageProps<"/banter">) {
  const user = await requireUser();
  const sort = (await searchParams).sort === "hot" ? "hot" : "new";
  const rows = await db.banter.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: true, likes: true, replies: { orderBy: { createdAt: "asc" }, include: { author: true } } },
  });
  const items: BanterItem[] = rows.map((b) => ({
    id: b.id,
    body: b.body,
    ago: ago(b.createdAt),
    author: { name: displayName(b.author), username: b.author.username, sfsu: isSfsu(b.author.email), avatarUrl: b.author.avatarUrl },
    likes: b.likes.length,
    liked: b.likes.some((l) => l.userId === user.id),
    replies: b.replies.map((r) => ({ id: r.id, body: r.body, ago: ago(r.createdAt), name: displayName(r.author), sfsu: isSfsu(r.author.email), username: r.author.username, avatarUrl: r.author.avatarUrl })),
  }));
  if (sort === "hot") items.sort((a, b) => b.likes + b.replies.length * 2 - (a.likes + a.replies.length * 2));

  return (
    <div>
      <PageHeader title="Banter" sub="Say whatever's on your mind. Hot takes, class rants, random thoughts. All fair game." />
      <BanterBoard items={items} me={displayName(user)} meAvatar={user.avatarUrl} sort={sort} />
    </div>
  );
}
