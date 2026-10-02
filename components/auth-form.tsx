"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/lib/actions";
import { Button, Card, Input, Label, Logo } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo size={48} />
          <h1 className="text-2xl font-bold">OpenSFSU</h1>
          <p className="text-sm text-muted-foreground">Find people to study, eat and hang out with.</p>
        </div>
        <Card>
          <form action={action} className="space-y-3">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="firstName">First name</Label><Input id="firstName" name="firstName" required /></div>
                <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" name="lastName" required /></div>
              </div>
            )}
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="you@sfsu.edu" required /></div>
            <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : undefined} /></div>
            {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            <Button className="w-full" disabled={pending}>{pending ? "..." : mode === "login" ? "Log in" : "Create account"}</Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? <>New here? <Link className="text-primary font-medium" href="/signup">Create an account</Link></> : <>Have an account? <Link className="text-primary font-medium" href="/login">Log in</Link></>}
        </p>
      </div>
    </main>
  );
}
