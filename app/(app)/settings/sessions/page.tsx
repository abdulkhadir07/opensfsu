import { Laptop, Smartphone, MonitorSmartphone } from "lucide-react";
import { db } from "@/lib/db";
import { currentToken, requireUser, sessionId } from "@/lib/auth";
import { revokeSession, signOutOthers } from "@/lib/actions";
import { deviceName } from "@/lib/profile";
import { Button, Card, Empty, PageHeader } from "@/components/ui";
import { BackToSettings } from "@/components/back-link";

export default async function Sessions() {
  const user = await requireUser();
  const mine = await currentToken();
  const sessions = await db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  const rows = sessions
    .map((s) => ({ id: sessionId(s.token), current: s.token === mine, device: deviceName(s.userAgent), ua: s.userAgent ?? "", created: s.createdAt }))
    .sort((a, b) => Number(b.current) - Number(a.current));
  const others = rows.filter((r) => !r.current).length;

  return (
    <div>
      <BackToSettings />
      <PageHeader title="Sessions" sub="Devices where you're logged in. Revoke any you don't recognize." />
      <Card className="divide-y p-0">
        {rows.map((r) => {
          const Icon = /iPhone|Android/.test(r.ua) ? Smartphone : /Mac|Windows|Linux/.test(r.ua) ? Laptop : MonitorSmartphone;
          return (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  {r.device}
                  {r.current && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">This device</span>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.created ? `Signed in ${r.created.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Signed in earlier"}
                </div>
              </div>
              {!r.current && (
                <form action={revokeSession.bind(null, r.id)}><Button variant="danger">Revoke</Button></form>
              )}
            </div>
          );
        })}
      </Card>
      <div className="mt-5">
        {others > 0 ? (
          <form action={signOutOthers}><Button variant="outline">Sign out everywhere else ({others})</Button></form>
        ) : (
          <Empty icon={MonitorSmartphone}>You&apos;re only logged in on this device.</Empty>
        )}
      </div>
    </div>
  );
}
