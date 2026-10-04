import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ProfileView } from "@/components/profile-view";

export default async function UserProfile({ params }: PageProps<"/u/[username]">) {
  const me = await requireUser();
  const { username } = await params;
  if (username === me.username) redirect("/profile");
  const user = await db.user.findUnique({ where: { username } });
  if (!user) notFound();
  return <ProfileView user={user} mine={false} />;
}
