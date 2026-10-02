import type { PrismaClient } from "@prisma/client";

const M = 60000;

export async function seedBanter(db: PrismaClient) {
  await db.banterLike.deleteMany();
  await db.banterReply.deleteMany();
  await db.banter.deleteMany();
  const u = Object.fromEntries((await db.user.findMany()).map((x) => [x.email.split("@")[0], x.id]));
  const now = Date.now();
  const threads: { by: string; body: string; ago: number; likes: string[]; replies: [string, string][] }[] = [
    {
      by: "jay", body: "Why is the 28 bus always full right when I need it 😭", ago: 25, likes: ["maya", "priya", "leo"],
      replies: [["priya", "Every single morning. I've started walking from Stonestown"], ["leo", "Take the M, it's way more chill"]],
    },
    {
      by: "maya", body: "Hot take: the 3rd floor of the library is better than the 4th. Fight me.", ago: 90, likes: ["jay", "sam"],
      replies: [["jay", "4th floor has the outlets though"], ["maya", "Bring a power bank like a normal person 😤"], ["sam", "Visiting and I agree, the 3rd floor views are great"]],
    },
    { by: "priya", body: "Does anyone know if the Japanese club is meeting this week?", ago: 160, likes: ["leo"], replies: [] },
    {
      by: "leo", body: "Just saw the fog roll in over Lake Merced from the quad. SF never gets old.", ago: 240, likes: ["maya", "priya", "jay", "sam"],
      replies: [["maya", "Welcome to SFSU, the fog is our mascot"]],
    },
  ];
  for (const t of threads) {
    const b = await db.banter.create({ data: { authorId: u[t.by], body: t.body, createdAt: new Date(now - t.ago * M) } });
    await db.banterLike.createMany({ data: t.likes.map((l) => ({ banterId: b.id, userId: u[l] })) });
    for (let i = 0; i < t.replies.length; i++) {
      await db.banterReply.create({ data: { banterId: b.id, authorId: u[t.replies[i][0]], body: t.replies[i][1], createdAt: new Date(now - (t.ago - 5 - i * 6) * M) } });
    }
  }
}
