import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { AvatarMenu } from "@/components/avatar-menu";
import { displayName, isSfsu } from "@/lib/utils";
import { Logo, SfsuBadge } from "@/components/ui";
import { CreateButton, FloatingCreate, NavLinks } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const name = displayName(user);
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
          <Logo size={32} />
          OpenSFSU
        </div>
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <AvatarMenu name={name} src={user.avatarUrl} />
          <Link href="/profile" className="min-w-0 hover:opacity-80">
            <div className="flex items-center gap-1.5 truncate text-sm font-semibold">{name} {isSfsu(user.email) && <SfsuBadge />}</div>
            <div className="text-xs text-muted-foreground">{user.points} pts · @{user.username}</div>
          </Link>
        </div>
        <div className="mb-4"><CreateButton /></div>
        <nav className="flex flex-col gap-1"><NavLinks /></nav>
      </aside>
      <header className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
        <Logo size={28} />
        <NavLinks compact />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 md:p-8 md:pb-28">{children}</main>
      <FloatingCreate />
    </div>
  );
}

