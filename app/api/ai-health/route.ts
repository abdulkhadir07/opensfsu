import { NextResponse } from "next/server";
import { safetyCheck } from "@/lib/ai";

// Quick check that the deployed app can reach Gemini. Never returns the key itself.
export async function GET() {
  const keySet = !!process.env.GEMINI_API_KEY;
  const started = Date.now();
  // a phrase the keyword rules don't catch, so only Gemini can flag it
  const r = keySet ? await safetyCheck("meet me behind the gym after dark, come alone", "message") : null;
  return NextResponse.json({ keySet, geminiFlaggedIt: r ? !r.ok : null, reason: r?.reason ?? null, ms: Date.now() - started });
}
