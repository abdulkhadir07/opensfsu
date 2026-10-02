import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// gemini-2.5-flash is closed to new API keys. Free-tier quotas are per model, so we walk a chain
// of current Flash models: if one is rate limited (429) or overloaded (503) the next one answers.
const MODELS: { model: string; thinking: boolean }[] = [
  { model: "gemini-3.5-flash", thinking: false },
  { model: "gemini-3.8-flash", thinking: false },
  { model: "gemini-3.5-flash-lite", thinking: true },
  { model: "gemini-flash-latest", thinking: true },
];

function client() {
  const key = process.env.GEMINI_API_KEY;
  return key ? new GoogleGenAI({ apiKey: key }) : null;
}

async function askJson(prompt: string, temperature = 0.2): Promise<unknown> {
  const ai = client();
  if (!ai) throw new Error("no key");
  let lastErr: unknown;
  const started = Date.now();
  for (const { model, thinking } of MODELS) {
    if (Date.now() - started > 6000) break; // give up and use the rules rather than keep the user waiting
    try {
      const call = ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature, ...(thinking ? {} : { thinkingConfig: { thinkingBudget: 0 } }) },
      });
      // never let a slow model call hang the page
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000));
      const res = await Promise.race([call, timeout]);
      console.log(`[ai] ${model} answered in ${Date.now() - started}ms`);
      return JSON.parse(res.text ?? "{}");
    } catch (e) {
      lastErr = e;
      console.warn(`[ai] ${model} failed:`, String((e as Error).message).slice(0, 160));
    }
  }
  throw lastErr;
}

// ---------- composePost ----------

export const draftSchema = z.object({
  title: z.string().min(1).max(80),
  type: z.enum(["SINGLE", "GROUP"]),
  capacity: z.coerce.number().int().min(1).max(50),
  scope: z.enum(["CAMPUS", "CITY", "GLOBAL"]),
  place: z.string().max(120).nullable().optional(),
  startsAt: z.string().max(60).nullable().optional(),
  tags: z.array(z.string()).max(6),
});
export type Draft = z.infer<typeof draftSchema>;

export async function composePost(text: string): Promise<Draft & { ai: boolean }> {
  try {
    const out = await askJson(`You turn a San Francisco State University student's casual invite into a structured post.
Return JSON: {"title": short casual title (max 60 chars, no dashes), "type": "SINGLE" if looking for exactly one person else "GROUP",
"capacity": number of OTHER people wanted (integer), "scope": always "CAMPUS",
"place": a spot on the SFSU campus (e.g. J. Paul Leonard Library, Cesar Chavez Student Center, Mashouf Wellness Center, Cox Stadium, The Quad) or null, "startsAt": human time like "Today 3:00 PM" or null, "tags": 2-5 lowercase single-word tags}.
Invite: """${text}"""`);
    return { ...draftSchema.parse(out), scope: "CAMPUS", ai: true };
  } catch {
    return { ...fallbackCompose(text), ai: false };
  }
}

const PLACES: [RegExp, string, Draft["scope"]][] = [
  [/library|leonard/i, "J. Paul Leonard Library", "CAMPUS"],
  [/cesar chavez|student center|caesar/i, "Cesar Chavez Student Center", "CAMPUS"],
  [/gym|mashouf|wellness/i, "Mashouf Wellness Center", "CAMPUS"],
  [/cox stadium|field/i, "Cox Stadium", "CAMPUS"],
  [/\bquad\b/i, "The Quad", "CAMPUS"],
  [/village|centennial/i, "Village at Centennial Square", "CAMPUS"],
  [/humanities/i, "Humanities Building", "CAMPUS"],
  [/thornton/i, "Thornton Hall", "CAMPUS"],
];

const TAG_WORDS = ["study", "lunch", "coffee", "soccer", "basketball", "walk", "hike", "gaming", "music", "japanese", "language", "art", "code", "csc", "math", "food", "sunset", "run", "gym", "movie"];

function fallbackCompose(text: string): Draft {
  const t = text.toLowerCase();
  const nMatch = t.match(/(\d+)\s*(people|persons|friends|others|ppl|players|students)/);
  const capacity = nMatch ? Math.min(50, Math.max(1, parseInt(nMatch[1]))) : /\b(someone|a buddy|one person|a partner)\b/.test(t) ? 1 : 3;
  let place: string | null = null;
  let scope: Draft["scope"] = "CAMPUS";
  for (const [re, p, s] of PLACES) if (re.test(text)) { place = p; scope = s; break; }
  const tm = text.match(/\b(\d{1,2}(:\d{2})?\s*(am|pm))\b/i) ?? text.match(/\b(noon|tonight|this evening|tomorrow|this afternoon|sunset)\b/i);
  const day = /tomorrow/i.test(text) ? "Tomorrow" : "Today";
  const startsAt = tm ? (/tomorrow/i.test(tm[1]) ? "Tomorrow" : `${day} ${tm[1]}`) : null;
  const tags = TAG_WORDS.filter((w) => t.includes(w)).slice(0, 5);
  const first = text.split(/[.!?\n]/)[0].trim();
  const title = first.length > 60 ? first.slice(0, 57) + "..." : first || "Hang out";
  return { title, type: capacity === 1 ? "SINGLE" : "GROUP", capacity, scope, place, startsAt, tags: tags.length ? tags : ["meetup"] };
}

// ---------- safetyCheck ----------

const safetySchema = z.object({ ok: z.boolean(), reason: z.string().nullable().optional() });
export type Safety = { ok: boolean; reason?: string };

export async function safetyCheck(text: string, kind: "post" | "message"): Promise<Safety> {
  const rule = fallbackSafety(text);
  if (!rule.ok) return rule; // hard rules always win, even with AI on
  try {
    const out = safetySchema.parse(await askJson(`You are "Safety Guardian" for a college meetup app at SFSU. Review this ${kind}.
Flag (ok=false) if it contains: harassment, hate, sexual content, threats; scams or requests for money/gift cards/crypto;
sharing phone numbers, home addresses, or other personal info; risky meetups (private residences, late night 11pm-5am, off-campus with strangers in isolated places).
Normal friendly campus plans are ok. Return JSON {"ok": boolean, "reason": short friendly one-sentence reason with no dashes, or null}.
Text: """${text}"""`));
    return out.ok ? { ok: true } : { ok: false, reason: out.reason || "This looks unsafe." };
  } catch {
    return rule;
  }
}

const RULES: [RegExp, string][] = [
  [/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, "No phone numbers please. Keep chatting here until you meet."],
  [/\b\d{2,5}\s+\w+(\s\w+)?\s(st|street|ave|avenue|blvd|rd|road|way|dr|drive)\b/i, "No home addresses please. Pick a public spot instead."],
  [/\b(my|your|his|her) (place|apartment|apt|house|room|dorm room)\b|come over/i, "Meeting at someone's place isn't safe with people you just met. Try somewhere public on campus."],
  [/\b(1[12]|[1-4])\s*(:\d{2})?\s*am\b|midnight|after midnight/i, "That's pretty late. Try a time between 5am and 11pm."],
  [/\b11\s*(:\d{2})?\s*pm\b/i, "That's pretty late. Try a time between 5am and 11pm."],
  [/venmo|cashapp|cash app|zelle|gift ?card|bitcoin|crypto|wire (me|money)|send (me )?money/i, "Requests for money or payments look like a scam."],
  [/\b(stupid|idiot|ugly|loser|kill yourself|kys|retard)\b/i, "That came across as mean. Keep it friendly."],
  [/\bssn\b|social security|password|credit card/i, "Never share sensitive personal info."],
];

function fallbackSafety(text: string): Safety {
  for (const [re, reason] of RULES) if (re.test(text)) return { ok: false, reason };
  return { ok: true };
}

// ---------- matchReason (stretch) ----------

export function matchReason(postTags: string[], interests: string[]): string | null {
  const i = interests.map((x) => x.toLowerCase());
  const shared = postTags.filter((t) => i.some((x) => x.includes(t.toLowerCase()) || t.toLowerCase().includes(x)));
  return shared.length ? `You're into ${shared.slice(0, 2).join(" and ")}, so this might be your thing` : null;
}

const STYLE = "Write like a friendly college student. Casual, short, no dashes, no hashtags.";

// ---------- feed insights: daily digest + personal match reasons in one call ----------

type FeedPostIn = { id: string; title: string; tags: string[]; place: string | null; startsAt: string | null; mine: boolean };

const g = globalThis as unknown as { aiCache?: Map<string, { at: number; value: unknown }> };
const cache = (g.aiCache ??= new Map());

// small in-memory cache so page reloads don't burn through the free-tier quota
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T & { ai: boolean }>): Promise<T & { ai: boolean }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T & { ai: boolean };
  const value = await fn();
  if (value.ai) cache.set(key, { at: Date.now(), value });
  return value;
}

export async function feedInsights(posts: FeedPostIn[], me: { firstName: string; interests: string[]; bio: string | null }) {
  return cached(`feed:${me.firstName}:${posts.map((p) => p.id).join(",")}`, 5 * 60 * 1000, () => feedInsightsUncached(posts, me));
}

async function feedInsightsUncached(posts: FeedPostIn[], me: { firstName: string; interests: string[]; bio: string | null }) {
  const others = posts.filter((p) => !p.mine);
  try {
    if (!posts.length) throw new Error("empty");
    const out = z
      .object({ digest: z.string(), reasons: z.array(z.object({ id: z.string(), reason: z.string().nullable() })) })
      .parse(
        await askJson(
          `You power the home feed of OpenSFSU, an app where SFSU students post open invites. ${STYLE}
Student: ${me.firstName}. Interests: ${me.interests.join(", ") || "unknown"}. Bio: ${me.bio ?? "none"}.
Open invites (JSON): ${JSON.stringify(posts.map(({ id, title, tags, place, startsAt }) => ({ id, title, tags, place, startsAt })))}
Return JSON {"digest": 1 or 2 sentences (max 220 chars) telling ${me.firstName} what's happening on campus today and pointing out the best fit for them,
"reasons": [{"id": invite id, "reason": one short sentence (max 90 chars) on why it fits this student, or null if it doesn't really fit}] for these ids only: ${others.map((p) => p.id).join(", ")}}`,
          0.6,
        ),
      );
    const reasons = Object.fromEntries(out.reasons.filter((r) => r.reason).map((r) => [r.id, r.reason as string]));
    return { digest: out.digest, reasons, ai: true };
  } catch {
    const reasons: Record<string, string> = {};
    for (const p of others) {
      const r = matchReason(p.tags, me.interests);
      if (r) reasons[p.id] = r;
    }
    const best = others.find((p) => reasons[p.id]);
    const digest = posts.length
      ? `${posts.length} invite${posts.length === 1 ? "" : "s"} open on campus today${best ? `. "${best.title}" looks like a good fit for you.` : "."}`
      : "Quiet day so far. Be the first to start something.";
    return { digest, reasons, ai: false };
  }
}

// ---------- chat icebreaker ----------

export async function icebreaker(post: { title: string; content: string; tags: string[]; place: string | null; startsAt: string | null }, names: string[]) {
  try {
    const out = z.object({ text: z.string().min(1).max(300) }).parse(
      await askJson(
        `You are OpenSFSU's AI host. A group chat just opened for this campus invite: ${JSON.stringify(post)}. Members: ${names.join(", ")}.
${STYLE} Write one icebreaker message (max 200 chars) that greets them by first name and gives them a fun, specific question to answer about the plan. Return JSON {"text": string}.`,
        0.9,
      ),
    );
    return out.text;
  } catch {
    const q = post.tags.includes("study") || post.tags.includes("csc")
      ? "which topic is giving you the most trouble right now?"
      : post.tags.includes("food") || post.tags.includes("lunch")
        ? "what's your go to order on campus?"
        : "what got you interested in this one?";
    const where = post.place && !post.title.toLowerCase().includes(post.place.toLowerCase()) ? ` at ${post.place}` : "";
    return `Hey ${names.join(" and ")} 👋 You're all set for ${post.title}${where}. Quick icebreaker: ${q}`;
  }
}

// ---------- smart replies ----------

export async function smartReplies(context: string, thread: { name: string; body: string }[], me: string, fresh = false): Promise<string[]> {
  const key = `replies:${me}:${context}:${thread.length}:${thread.at(-1)?.body ?? ""}`;
  if (fresh) cache.delete(key);
  const r = await cached(key, 10 * 60 * 1000, () => smartRepliesUncached(context, thread, me));
  return r.replies;
}

async function smartRepliesUncached(context: string, thread: { name: string; body: string }[], me: string): Promise<{ replies: string[]; ai: boolean }> {
  try {
    const out = z.object({ replies: z.array(z.string().min(1).max(80)).min(1).max(3) }).parse(
      await askJson(
        `Suggest replies for ${me} on OpenSFSU, a campus app. Context: ${context}.
Conversation so far (oldest first): ${JSON.stringify(thread.slice(-8))}
${STYLE} Give 3 different short replies (max 60 chars each) ${me} could send next. Keep them safe and friendly, never share personal contact info. Return JSON {"replies": [string, string, string]}.`,
        0.8,
      ),
    );
    return { replies: out.replies.slice(0, 3), ai: true };
  } catch {
    const last = thread.at(-1)?.body.toLowerCase() ?? "";
    if (/\?$/.test(last)) return { replies: ["Yeah, sounds good!", "Hmm, let me check and get back to you", "Good question, what do you think?"], ai: false };
    if (/late|on my way|omw/.test(last)) return { replies: ["No worries, see you soon!", "All good, I'll save you a seat", "Take your time 👍"], ai: false };
    return { replies: ["On my way!", "Sounds good 👍", "Where exactly should we meet?"], ai: false };
  }
}
