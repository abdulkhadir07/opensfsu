import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedBanter } from "./banter-data";

const db = new PrismaClient();
const H = 3600 * 1000;

async function main() {
  await db.banterLike.deleteMany();
  await db.banterReply.deleteMany();
  await db.banter.deleteMany();
  await db.rating.deleteMany();
  await db.message.deleteMany();
  await db.roomMember.deleteMany();
  await db.room.deleteMany();
  await db.request.deleteMany();
  await db.post.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const mk = (email: string, firstName: string, lastName: string, interests: string, points: number, bio: string) =>
    db.user.create({ data: { email, firstName, lastName, username: email.split("@")[0], interests, points, bio, passwordHash } });

  const maya = await mk("maya@sfsu.edu", "Maya", "Patel", "study,csc,code,coffee", 48, "CS junior, will debug for boba.");
  const jay = await mk("jay@sfsu.edu", "Jay", "Nguyen", "soccer,run,gym,food", 41, "Kinesiology. Always down for pickup.");
  const priya = await mk("priya@sfsu.edu", "Priya", "Raman", "food,lunch,japanese,language,art", 36, "Design major learning Japanese.");
  const leo = await mk("leo@sfsu.edu", "Leo", "Martinez", "walk,hike,sunset,music", 27, "Transfer student, new to SF.");
  const sam = await mk("sam@gmail.com", "Sam", "Okafor", "music,gaming,coffee,walk", 15, "Visiting from Oakland.");

  const now = Date.now();
  const post = (authorId: string, d: { title: string; content: string; type?: string; capacity: number; scope: string; place: string; startsAt: string; tags: string; ago: number }) =>
    db.post.create({
      data: {
        authorId, title: d.title, content: d.content, type: d.type ?? "GROUP", capacity: d.capacity, scope: d.scope, place: d.place,
        startsAt: d.startsAt, tags: d.tags, createdAt: new Date(now - d.ago * H), expiresAt: new Date(now + (24 - d.ago) * H),
      },
    });

  const study = await post(maya.id, { title: "CSC 413 study group before the midterm", content: "Going over the scheduler and memory management chapters. Bring questions, I'll bring whiteboard markers.", capacity: 4, scope: "CAMPUS", place: "J. Paul Leonard Library, 3rd floor", startsAt: "Today 4:00 PM", tags: "study,csc,code", ago: 1 });
  const lunch = await post(priya.id, { title: "Lunch at Cesar Chavez Student Center", content: "Grabbing lunch between classes, anyone want to join? Happy to meet new people.", capacity: 3, scope: "CAMPUS", place: "Cesar Chavez Student Center", startsAt: "Today 12:30 PM", tags: "lunch,food", ago: 3 });
  await post(leo.id, { title: "Sunset walk around campus", content: "New to SFSU and still learning my way around. Easy pace, about an hour, ending at the quad for the sunset.", capacity: 3, scope: "CAMPUS", place: "The Quad", startsAt: "Today 6:30 PM", tags: "walk,sunset,hike", ago: 2 });
  await post(jay.id, { title: "Pickup soccer, need a few players", content: "We're short a few players for a casual 6v6. All skill levels welcome, bring water.", capacity: 6, scope: "CAMPUS", place: "Cox Stadium field", startsAt: "Today 5:00 PM", tags: "soccer,sports,run", ago: 0.5 });
  await post(priya.id, { title: "Japanese conversation practice (beginner friendly)", content: "Practicing casual 日本語 over coffee. Any level is fine. We'll switch to English when stuck.", type: "GROUP", capacity: 5, scope: "CAMPUS", place: "Humanities Building lounge", startsAt: "Tomorrow 1:00 PM", tags: "japanese,language", ago: 4 });

  // Pending requests so the Requests page has something to accept
  await db.request.create({ data: { postId: study.id, userId: leo.id } });
  await db.request.create({ data: { postId: study.id, userId: sam.id } });

  // Accepted request: Jay joined Priya's lunch, active chat
  await db.request.create({ data: { postId: lunch.id, userId: jay.id, status: "ACCEPTED" } });
  const room = await db.room.create({ data: { postId: lunch.id, members: { create: [{ userId: priya.id }, { userId: jay.id }] } } });
  await db.message.create({
    data: {
      roomId: room.id, userId: priya.id, flagReason: "AI_ICEBREAKER", createdAt: new Date(now - 34 * 60000),
      body: "Hey Priya and Jay 👋 You're set for lunch at the Cesar Chavez Student Center. Quick icebreaker: what's your go to order on campus?",
    },
  });
  const lines: [string, string][] = [
    [jay.id, "Hey Priya! Still on for lunch at 12:30?"],
    [priya.id, "Yes! I'll grab a table near the Peet's side of the Student Center."],
    [jay.id, "Perfect. I'm coming from the gym so might be 5 min late"],
    [priya.id, "No worries 😄 Have you tried the new poke place?"],
    [jay.id, "Not yet, let's do it"],
    [priya.id, "Deal. I'm wearing a green jacket so you can spot me"],
  ];
  for (let i = 0; i < lines.length; i++) {
    await db.message.create({ data: { roomId: room.id, userId: lines[i][0], body: lines[i][1], createdAt: new Date(now - (30 - i * 4) * 60000) } });
  }

  // Closed room from yesterday with ratings (Maya + Leo + Sam)
  const old = await db.post.create({
    data: {
      authorId: maya.id, title: "Coffee + LeetCode at Cafe 101", content: "Working through a few easy problems together.", capacity: 3, scope: "CAMPUS",
      place: "Cafe 101", startsAt: "Yesterday 2:00 PM", tags: "code,coffee", createdAt: new Date(now - 30 * H), expiresAt: new Date(now - 6 * H),
    },
  });
  await db.request.createMany({ data: [{ postId: old.id, userId: leo.id, status: "ACCEPTED" }, { postId: old.id, userId: sam.id, status: "ACCEPTED" }] });
  const closed = await db.room.create({
    data: { postId: old.id, closed: true, closedAt: new Date(now - 26 * H), members: { create: [{ userId: maya.id }, { userId: leo.id }, { userId: sam.id }] } },
  });
  await db.message.createMany({
    data: [
      { roomId: closed.id, userId: maya.id, body: "I'm at the window table!", createdAt: new Date(now - 28 * H) },
      { roomId: closed.id, userId: leo.id, body: "On my way, grabbing a latte first", createdAt: new Date(now - 27.9 * H) },
      { roomId: closed.id, userId: sam.id, body: "Thanks both, that was fun!", createdAt: new Date(now - 26.1 * H) },
    ],
  });
  await db.rating.createMany({
    data: [
      { roomId: closed.id, raterId: leo.id, rateeId: maya.id, score: 5 },
      { roomId: closed.id, raterId: sam.id, rateeId: maya.id, score: 5 },
      { roomId: closed.id, raterId: maya.id, rateeId: leo.id, score: 4 },
      { roomId: closed.id, raterId: leo.id, rateeId: sam.id, score: 4 },
    ],
  });

  await seedBanter(db);

  console.log("Seeded: maya/jay/priya/leo @sfsu.edu, sam@gmail.com, password123");
}

main().finally(() => db.$disconnect());
