"use server";

import { redirect } from "next/navigation";
import { checkPassword, registerUser } from "@/lib/data/api";
import { ApiError } from "@/lib/data/errors";
import { endSession, startSession } from "@/lib/server/session";

/** Only same-site paths, so a crafted link can't bounce people elsewhere after signing in. */
const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const userId = checkPassword(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!userId) return "That email and password don't match an account.";
  await startSession(userId);
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: string | null, form: FormData): Promise<string | null> {
  let userId: string;
  try {
    userId = registerUser({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  } catch (e) {
    if (e instanceof ApiError) return e.message;
    throw e;
  }
  await startSession(userId);
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
