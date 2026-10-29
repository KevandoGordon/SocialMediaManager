import { NextResponse, type NextRequest } from "next/server";
import { dispatch } from "@/lib/server/rpc";
import { currentUserId } from "@/lib/server/session";

/**
 * Cross-site requests are refused twice over: the Origin must be this app, and the JSON content
 * type means a browser won't send a cross-site request without a CORS preflight we never approve.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = process.env.APP_URL ?? req.nextUrl.origin;
  if (!origin || new URL(origin).origin !== new URL(allowed).origin || !req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ ok: false, code: "forbidden", message: "Cross-site request refused." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const result = await dispatch(await currentUserId(), body?.method, body?.args);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
