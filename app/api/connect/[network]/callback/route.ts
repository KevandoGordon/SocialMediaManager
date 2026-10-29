import type { NextRequest } from "next/server";
import { finishConnection, runAs, takeConnectionAttempt } from "@/lib/data/api";
import { ApiError } from "@/lib/data/errors";
import { NETWORKS } from "@/lib/networks";
import { encrypt } from "@/lib/server/crypto";
import { ConnectError, credentialsFor, PROVIDERS } from "@/lib/server/oauth/providers";
import { backToAccounts, redirectUri } from "@/lib/server/oauth/redirects";
import { currentUserId } from "@/lib/server/session";
import type { NetworkId } from "@/lib/types";

/** Step 2: the network sends the user back with a code; swap it for a token and store the profile. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  if (!(network in PROVIDERS)) return backToAccounts(req, { error: "Unknown network." });
  const id = network as NetworkId;
  const name = NETWORKS[id].name;
  const q = req.nextUrl.searchParams;
  const userId = await currentUserId();
  if (!userId) return backToAccounts(req, { error: "Your session ended during the connection. Sign in and try again." });

  try {
    const attempt = runAs(userId, () => takeConnectionAttempt(q.get("state") ?? "", id));
    const back = (extra: Record<string, string>) => backToAccounts(req, { workspace: attempt.workspaceId, ...extra });
    if (q.get("error") || !q.get("code")) {
      return back({ error: `${name} connection was cancelled${q.get("error_description") ? `: ${q.get("error_description")}` : "."}` });
    }
    const creds = credentialsFor(id);
    if (!creds) return back({ error: `${name} isn't set up on this server.` });

    const token = await PROVIDERS[id].exchange({ ...creds, code: q.get("code")!, redirectUri: redirectUri(req, id), verifier: attempt.verifier });
    const profiles = await PROVIDERS[id].profiles(token, creds);
    const obtainedAt = new Date().toISOString();
    const sealed = profiles.map(({ token: t, ...p }) => ({ ...p, encryptedToken: encrypt(JSON.stringify({ ...t, obtainedAt })) }));

    const result = runAs(userId, () => finishConnection(attempt.workspaceId, id, sealed));
    return back(result.connected ? { connected: id } : { choose: result.choiceId });
  } catch (e) {
    if (e instanceof ApiError || e instanceof ConnectError) return backToAccounts(req, { error: e.message });
    console.error(`connect ${id} failed`, e);
    return backToAccounts(req, { error: `Couldn't reach ${name}. Check the server log and try again.` });
  }
}
