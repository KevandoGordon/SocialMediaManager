import { NextResponse, type NextRequest } from "next/server";
import { beginConnection, runAs } from "@/lib/data/api";
import { ApiError } from "@/lib/data/errors";
import { NETWORKS } from "@/lib/networks";
import { randomToken } from "@/lib/server/crypto";
import { credentialsFor, pkceChallenge, PROVIDERS } from "@/lib/server/oauth/providers";
import { backToAccounts, redirectUri } from "@/lib/server/oauth/redirects";
import { currentUserId } from "@/lib/server/session";
import type { NetworkId } from "@/lib/types";

/** Step 1: check the caller may connect accounts in this workspace, then send them to the network. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  if (!(network in PROVIDERS)) return backToAccounts(req, { error: "Unknown network." });
  const id = network as NetworkId;
  const userId = await currentUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", req.url));

  const creds = credentialsFor(id);
  const { idEnv, secretEnv } = PROVIDERS[id];
  if (!creds) return backToAccounts(req, { error: `${NETWORKS[id].name} isn't set up yet. Add ${idEnv} and ${secretEnv} to .env.local and restart the app.` });

  const workspaceId = req.nextUrl.searchParams.get("workspace") ?? "";
  const verifier = PROVIDERS[id].pkce ? randomToken(48) : null;
  try {
    const state = runAs(userId, () => beginConnection(workspaceId, id, verifier));
    return NextResponse.redirect(
      PROVIDERS[id].authorizeUrl({ clientId: creds.clientId, redirectUri: redirectUri(req, id), state, challenge: verifier && pkceChallenge(verifier) }),
    );
  } catch (e) {
    if (e instanceof ApiError) return backToAccounts(req, { error: e.message });
    throw e;
  }
}
