import { PageHeader } from "@/components/ui";
import { BackToSettings } from "@/components/back-link";
import { PasswordForm } from "@/components/password-form";

export default function PasswordPage() {
  return (
    <div>
      <BackToSettings />
      <PageHeader title="Password" sub="Use at least 8 characters. Don't reuse a password from another site." />
      <PasswordForm />
    </div>
  );
}
