"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { createSession, currentToken, destroySession, requireUser, sessionId } from "./auth";
import { composePost, draftSchema, icebreaker, safetyCheck, smartReplies, type Draft } from "./ai";
import { AI_MARK, splitTags } from "./utils";

export type FormState = { error?: string } | undefined;

// ---------- auth ----------

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = z
    .object({
      firstName: z.string().trim().min(1, "First name required"),
      lastName: z.string().trim().min(1, "Last name required"),
      email: z.string().trim().toLowerCase().email("Enter a valid email"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { firstName, lastName, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with that email already exists" };
  const base = email.split("@")[0].replace(/[^a-z0-9]/g, "") || "user";
  let username = base;
  for (let i = 1; await db.user.findUnique({ where: { username } }); i++) username = `${base}${i}`;
  const user = await db.user.create({ data: { firstName, lastName, email, username, passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(user.id);
  redirect("/");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Wrong email or password" };
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/welcome");
}

// ---------- posts ----------

export async function draftPost(text: string) {
  await requireUser();
  if (!text.trim()) return null;
  return composePost(text);
}

export type PostState = { error?: string; held?: { id: string; reason: string } } | undefined;

export async function createPost(_: PostState, fd: FormData): Promise<PostState> {
  const user = await requireUser();
  const content = String(fd.get("content") ?? "").trim();
  const parsed = draftSchema.safeParse({
    title: fd.get("title"),
    type: fd.get("type"),
    capacity: fd.get("capacity"),
    scope: "CAMPUS",
    place: fd.get("place") || null,
    startsAt: fd.get("startsAt") || null,
    tags: String(fd.get("tags") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 6),
  });
  if (!content) return { error: "Describe your invite first" };
  if (!parsed.success) return { error: `Check the ${parsed.error.issues[0].path.join(".")} field: ${parsed.error.issues[0].message}` };
  const d: Draft = parsed.data;
  const check = await safetyCheck([d.title, content, d.place, d.startsAt].filter(Boolean).join("\n"), "post");
  const editId = String(fd.get("editId") ?? "");
  const data = {
    content, title: d.title, type: d.type, capacity: d.capacity, scope: d.scope, place: d.place ?? null, startsAt: d.startsAt ?? null,
    tags: d.tags.join(","), status: check.ok ? "ACTIVE" : "HELD", holdReason: check.ok ? null : check.reason ?? "Flagged",
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  };
  const existing = editId ? await db.post.findFirst({ where: { id: editId, authorId: user.id } }) : null;
  const post = existing ? await db.post.update({ where: { id: existing.id }, data }) : await db.post.create({ data: { ...data, authorId: user.id } });
  if (!check.ok) return { held: { id: post.id, reason: data.holdReason! } };
  revalidatePath("/");
  redirect("/");
}

export async function requestJoin(postId: string) {
  const user = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId === user.id || post.status !== "ACTIVE") return;
  await db.request.upsert({ where: { postId_userId: { postId, userId: user.id } }, create: { postId, userId: user.id }, update: { status: "PENDING" } });
  revalidatePath("/");
  revalidatePath("/requests");
}

// ---------- requests ----------

export async function respondRequest(requestId: string, accept: boolean): Promise<FormState> {
  const user = await requireUser();
  const req = await db.request.findUnique({ where: { id: requestId }, include: { post: true } });
  if (!req || req.post.authorId !== user.id || req.status !== "PENDING") return { error: "Request not found" };
  if (!accept) {
    await db.request.update({ where: { id: requestId }, data: { status: "DECLINED" } });
    revalidatePath("/requests");
    return;
  }
  const accepted = await db.request.count({ where: { postId: req.postId, status: "ACCEPTED" } });
  if (accepted >= req.post.capacity) return { error: "This post is already full" };
  await db.$transaction(async (tx) => {
    await tx.request.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
    const room = await tx.room.upsert({ where: { postId: req.postId }, create: { postId: req.postId }, update: {} });
    for (const uid of [user.id, req.userId]) {
      await tx.roomMember.upsert({ where: { roomId_userId: { roomId: room.id, userId: uid } }, create: { roomId: room.id, userId: uid }, update: {} });
    }
    await tx.user.update({ where: { id: user.id }, data: { points: { increment: 10 } } });
    await tx.user.update({ where: { id: req.userId }, data: { points: { increment: 5 } } });
  });
  const room = await db.room.findUnique({ where: { postId: req.postId }, include: { _count: { select: { messages: true } } } });
  if (room && room._count.messages === 0) await postIcebreaker(room.id);
  revalidatePath("/requests");
  revalidatePath("/chats");
}

export async function withdrawRequest(requestId: string) {
  const user = await requireUser();
  await db.request.updateMany({ where: { id: requestId, userId: user.id, status: "PENDING" }, data: { status: "WITHDRAWN" } });
  revalidatePath("/requests");
}

// ---------- chat ----------

export async function sendMessage(roomId: string, body: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const text = body.trim().slice(0, 1000);
  if (!text) return {};
  const room = await db.room.findFirst({ where: { id: roomId, members: { some: { userId: user.id } } } });
  if (!room) return { error: "Room not found" };
  if (room.closed) return { error: "This chat has ended" };
  const check = await safetyCheck(text, "message");
  if (!check.ok) return { error: `Safety Guardian blocked this: ${check.reason}` };
  await db.message.create({ data: { roomId, userId: user.id, body: text } });
  return {};
}

export async function endChat(roomId: string) {
  const user = await requireUser();
  await db.room.updateMany({ where: { id: roomId, members: { some: { userId: user.id } } }, data: { closed: true, closedAt: new Date() } });
  revalidatePath(`/chats/${roomId}`);
  redirect("/ratings");
}

// ---------- ratings ----------

export async function rate(roomId: string, rateeId: string, score: number) {
  const user = await requireUser();
  if (score < 1 || score > 5 || rateeId === user.id) return;
  const room = await db.room.findFirst({
    where: { id: roomId, closed: true, AND: [{ members: { some: { userId: user.id } } }, { members: { some: { userId: rateeId } } }] },
  });
  if (!room) return;
  const exists = await db.rating.findUnique({ where: { roomId_raterId_rateeId: { roomId, raterId: user.id, rateeId } } });
  if (exists) return;
  await db.$transaction([
    db.rating.create({ data: { roomId, raterId: user.id, rateeId, score } }),
    db.user.update({ where: { id: user.id }, data: { points: { increment: 3 } } }),
    ...(score >= 4 ? [db.user.update({ where: { id: rateeId }, data: { points: { increment: 5 } } })] : []),
  ]);
  revalidatePath("/ratings");
}

// ---------- banter ----------

export async function postBanter(body: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const text = body.trim().slice(0, 280);
  if (!text) return {};
  const check = await safetyCheck(text, "message");
  if (!check.ok) return { error: `Safety Guardian blocked this: ${check.reason}` };
  await db.banter.create({ data: { authorId: user.id, body: text } });
  revalidatePath("/banter");
  return {};
}

export async function replyBanter(banterId: string, body: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const text = body.trim().slice(0, 280);
  if (!text) return {};
  const check = await safetyCheck(text, "message");
  if (!check.ok) return { error: `Safety Guardian blocked this: ${check.reason}` };
  await db.banterReply.create({ data: { banterId, authorId: user.id, body: text } });
  revalidatePath("/banter");
  return {};
}

export async function toggleLike(banterId: string) {
  const user = await requireUser();
  const key = { banterId_userId: { banterId, userId: user.id } };
  if (await db.banterLike.findUnique({ where: key })) await db.banterLike.delete({ where: key });
  else await db.banterLike.create({ data: { banterId, userId: user.id } });
  revalidatePath("/banter");
}

// ---------- AI in chat & banter ----------

async function postIcebreaker(roomId: string) {
  const room = await db.room.findUnique({ where: { id: roomId }, include: { post: true, members: { include: { user: true } } } });
  if (!room || room.closed) return;
  const p = room.post;
  const text = await icebreaker(
    { title: p.title, content: p.content, tags: splitTags(p.tags), place: p.place, startsAt: p.startsAt },
    room.members.map((m) => m.user.firstName),
  );
  await db.message.create({ data: { roomId, userId: p.authorId, body: text, flagReason: AI_MARK } });
}

export async function askIcebreaker(roomId: string) {
  const user = await requireUser();
  const member = await db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
  if (member) await postIcebreaker(roomId);
}

export async function suggestChatReplies(roomId: string, fresh = false): Promise<string[]> {
  const user = await requireUser();
  const room = await db.room.findFirst({
    where: { id: roomId, members: { some: { userId: user.id } } },
    include: { post: true, messages: { orderBy: { createdAt: "desc" }, take: 8, include: { user: true } } },
  });
  if (!room) return [];
  const thread = room.messages.reverse().map((m) => ({ name: m.flagReason === AI_MARK ? "AI host" : m.user.firstName, body: m.body }));
  return smartReplies(`group chat for the campus invite "${room.post.title}" at ${room.post.place ?? "campus"}, ${room.post.startsAt ?? "today"}`, thread, user.firstName, fresh);
}

export async function suggestBanterReplies(banterId: string, fresh = false): Promise<string[]> {
  const user = await requireUser();
  const b = await db.banter.findUnique({ where: { id: banterId }, include: { author: true, replies: { orderBy: { createdAt: "asc" }, include: { author: true } } } });
  if (!b) return [];
  const thread = [{ name: b.author.firstName, body: b.body }, ...b.replies.map((r) => ({ name: r.author.firstName, body: r.body }))];
  return smartReplies("a public campus banter thread (casual chat board)", thread, user.firstName, fresh);
}

// ---------- profile ----------

export async function updateProfile(input: { firstName: string; lastName: string; bio: string; interests: string[] }): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z
    .object({
      firstName: z.string().trim().min(1, "First name can't be empty").max(40),
      lastName: z.string().trim().min(1, "Last name can't be empty").max(40),
      bio: z.string().trim().max(200, "Keep your bio under 200 characters"),
      interests: z.array(z.string().trim().toLowerCase().min(1).max(24)).max(12, "Up to 12 interests"),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { firstName, lastName, bio, interests } = parsed.data;
  const check = await safetyCheck(`${firstName} ${lastName}\n${bio}\n${interests.join(", ")}`, "post");
  if (!check.ok) return { error: `Safety Guardian blocked this: ${check.reason}` };
  await db.user.update({
    where: { id: user.id },
    data: { firstName, lastName, bio: bio || null, interests: [...new Set(interests.map((i) => i.replace(/[#,]/g, "")))].filter(Boolean).join(",") },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function setAvatar(dataUrl: string | null): Promise<{ error?: string }> {
  const user = await requireUser();
  if (dataUrl !== null) {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) return { error: "That file type isn't supported. Use JPEG, PNG or WebP." };
    if (dataUrl.length > 400_000) return { error: "That photo is too big. Try a smaller one." };
  }
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: dataUrl } });
  revalidatePath("/", "layout");
  return {};
}

// ---------- settings ----------

export type PasswordState = { error?: string; ok?: boolean } | undefined;

export async function changePassword(_: PasswordState, fd: FormData): Promise<PasswordState> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Your current password isn't right" };
  if (next.length < 8) return { error: "New password needs at least 8 characters" };
  if (next !== confirm) return { error: "The new passwords don't match" };
  if (next === current) return { error: "Pick a password you haven't used here" };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: true };
}

export async function revokeSession(id: string) {
  const user = await requireUser();
  const mine = await currentToken();
  const sessions = await db.session.findMany({ where: { userId: user.id }, select: { token: true } });
  const target = sessions.find((s) => sessionId(s.token) === id && s.token !== mine);
  if (target) await db.session.delete({ where: { token: target.token } });
  revalidatePath("/settings/sessions");
}

export async function signOutOthers() {
  const user = await requireUser();
  const mine = await currentToken();
  await db.session.deleteMany({ where: { userId: user.id, NOT: { token: mine ?? "" } } });
  revalidatePath("/settings/sessions");
}
