import { requireUser } from "@/lib/auth";
import { ProfileView } from "@/components/profile-view";

export default async function MyProfile() {
  const user = await requireUser();
  return <ProfileView user={user} mine />;
}
