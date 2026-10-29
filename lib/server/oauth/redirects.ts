import { NextResponse, type NextRequest } from "next/server";

const origin = (req: NextRequest) => process.env.APP_URL ?? req.nextUrl.origin;

/** Must match, character for character, the redirect URL registered with the network. */
export const redirectUri = (req: NextRequest, network: string) => `${origin(req)}/api/connect/${network}/callback`;

export const backToAccounts = (req: NextRequest, params: Record<string, string>) =>
  NextResponse.redirect(new URL(`/accounts?${new URLSearchParams(params)}`, origin(req)));
