import { cookies } from "next/headers";
import { randomToken, sha256 } from "./crypto";
import { persist, state } from "./state";

export const SESSION_COOKIE = "sc_session";
const SESSION_DAYS = 30;

/** The signed-in user's id, or null. The cookie holds a random token; only its hash is stored. */
export async function currentUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? state().sessions[sha256(token)] : undefined;
  return session && new Date(session.expiresAt) > new Date() ? session.userId : null;
}

export async function startSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const sessions = state().sessions;
  for (const [k, s] of Object.entries(sessions)) if (new Date(s.expiresAt) < new Date()) delete sessions[k];
  sessions[sha256(token)] = { userId, expiresAt: expiresAt.toISOString() };
  persist();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    delete state().sessions[sha256(token)];
    persist();
  }
  jar.delete(SESSION_COOKIE);
}
