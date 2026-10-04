import { requireUser } from "@/lib/auth";
import { displayName } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { BackToSettings } from "@/components/back-link";

export default async function Personal() {
  const user = await requireUser();
  const rows = [
    ["Name", displayName(user)],
    ["Email", user.email],
    ["Username", `@${user.username}`],
    ["Member since", user.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
  ];
  return (
    <div>
      <BackToSettings />
      <PageHeader title="Personal info" sub="You can change your name on your profile." />
      <Card className="divide-y p-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="text-sm text-muted-foreground">{k}</span>
            <span className="truncate font-medium">{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
