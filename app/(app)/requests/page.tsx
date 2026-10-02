import { Inbox, Send } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withdrawRequest } from "@/lib/actions";
import { displayName, isSfsu } from "@/lib/utils";
import { Avatar, Button, Card, Empty, PageHeader, SfsuBadge, Tabs } from "@/components/ui";
import { RespondButtons } from "@/components/respond-buttons";

const STATUS: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  ACCEPTED: "bg-primary/15 text-primary",
  DECLINED: "bg-destructive/10 text-destructive",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

export default async function Requests({ searchParams }: PageProps<"/requests">) {
  const user = await requireUser();
  const tab = (await searchParams).tab === "sent" ? "sent" : "received";
  const reqs = await db.request.findMany({
    where: tab === "sent" ? { userId: user.id } : { post: { authorId: user.id } },
    include: { user: true, post: { include: { author: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Requests" sub="People who want to join you, and invites you asked to join." />
      <Tabs active={tab} items={[{ key: "received", href: "/requests?tab=received", label: "Received" }, { key: "sent", href: "/requests?tab=sent", label: "Sent" }]} />
      {reqs.length === 0 ? (
        <Empty icon={tab === "sent" ? Send : Inbox}>{tab === "sent" ? "You haven't requested to join anything yet." : "No one has requested to join your posts yet."}</Empty>
      ) : (
        <div className="space-y-3">
          {reqs.map((r) => {
            const person = tab === "sent" ? r.post.author : r.user;
            const name = displayName(person);
            return (
              <Card key={r.id} className="animate-fade-up flex flex-wrap items-center gap-3 p-4">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">{name} {isSfsu(person.email) && <SfsuBadge />}</div>
                  <div className="truncate text-xs text-muted-foreground">{tab === "sent" ? "You asked to join" : "wants to join"} {r.post.title}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[r.status]}`}>{r.status.toLowerCase()}</span>
                {r.status === "PENDING" && tab === "received" && <RespondButtons id={r.id} />}
                {r.status === "PENDING" && tab === "sent" && (
                  <form action={withdrawRequest.bind(null, r.id)}><Button variant="outline">Withdraw</Button></form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
