import Link from "next/link";
import { ChevronRight, KeyRound, LogOut, MonitorSmartphone, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { displayName } from "@/lib/utils";
import { Avatar, Card, PageHeader } from "@/components/ui";

const ROWS = [
  { href: "/settings/personal", icon: UserRound, title: "Personal info", text: "Your name, email and username" },
  { href: "/settings/password", icon: KeyRound, title: "Password", text: "Change your password" },
  { href: "/settings/sessions", icon: MonitorSmartphone, title: "Sessions", text: "Where you're logged in" },
];

export default async function Settings() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader title="Settings" sub="Manage your account and where you're logged in." />
      <Link href="/profile" className="mb-5 block">
        <Card className="flex items-center gap-4 p-4 transition hover:border-primary/40">
          <Avatar name={displayName(user)} src={user.avatarUrl} size={48} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{displayName(user)}</div>
            <div className="text-sm text-muted-foreground">View and edit your profile</div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Card>
      </Link>
      <Card className="divide-y p-0">
        {ROWS.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="flex items-center gap-4 px-5 py-4 transition first:rounded-t-2xl hover:bg-muted/60">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{title}</div>
              <div className="text-sm text-muted-foreground">{text}</div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        ))}
        <form action={logout}>
          <button className="flex w-full cursor-pointer items-center gap-4 rounded-b-2xl px-5 py-4 text-left transition hover:bg-destructive/5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><LogOut className="size-5" /></span>
            <div className="flex-1">
              <div className="font-medium text-destructive">Sign out</div>
              <div className="text-sm text-muted-foreground">Log out on this device</div>
            </div>
          </button>
        </form>
      </Card>
    </div>
  );
}
