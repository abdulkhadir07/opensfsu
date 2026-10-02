export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const isSfsu = (email: string) => email.toLowerCase().endsWith("@sfsu.edu");

export const displayName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();

export function timeLeft(d: Date) {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export const splitTags = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

export function ago(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// AI host messages are stored as normal messages from the poster, marked with this flagReason
export const AI_MARK = "AI_ICEBREAKER";
