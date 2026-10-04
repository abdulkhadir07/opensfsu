"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleCheck } from "lucide-react";
import { changePassword } from "@/lib/actions";
import { Button, Card, Input, Label } from "./ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  if (state?.ok) {
    return (
      <Card className="animate-pop flex flex-col items-center gap-3 py-10 text-center">
        <CircleCheck className="size-12 text-primary" />
        <h2 className="text-xl font-bold">Password updated</h2>
        <p className="text-sm text-muted-foreground">Use your new password next time you log in.</p>
        <Link href="/settings" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Close</Link>
      </Card>
    );
  }
  return (
    <Card>
      <form action={action} className="space-y-4">
        <div><Label htmlFor="current">Current password</Label><Input id="current" name="current" type="password" autoComplete="current-password" required /></div>
        <div><Label htmlFor="next">New password</Label><Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required /></div>
        <div><Label htmlFor="confirm">Confirm new password</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></div>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <Button disabled={pending} className="w-full">{pending ? "Updating..." : "Update password"}</Button>
      </form>
    </Card>
  );
}
