"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/shell/sidebar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { signIn, signUp } from "./actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, action, pending] = useActionState(mode === "login" ? signIn : signUp, null);
  const next = useSearchParams().get("next") ?? "";
  const signup = mode === "signup";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">{signup ? "Create your account" : "Sign in"}</h1>
          <p className="mt-1 text-sm text-muted">
            {signup ? "Free for one workspace. Invitations sent to your email will be waiting." : "Welcome back."}
          </p>
          <form action={action} className="mt-5 space-y-3.5">
            <input type="hidden" name="next" value={next} />
            {signup && (
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={50} />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} />
              {signup && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {signup ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {signup ? "Already have an account? " : "New here? "}
          <Link href={signup ? "/login" : "/signup"} className="font-medium text-foreground underline-offset-4 hover:underline">
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
