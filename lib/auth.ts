import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";

export const COOKIE = "oc_session";

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.session.create({ data: { token, userId, expiresAt, userAgent } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.user;
}

export async function currentToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

// Session tokens are secrets, so the UI only ever sees a short hash of them
export const sessionId = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 16);

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/welcome");
  return u;
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  c.delete(COOKIE);
}
