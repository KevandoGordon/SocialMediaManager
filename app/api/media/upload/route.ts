import { NextResponse, type NextRequest } from "next/server";
import { runAs, uploadMedia } from "@/lib/data/api";
import { ApiError } from "@/lib/data/errors";
import { currentUserId } from "@/lib/server/session";

const STATUS: Partial<Record<ApiError["code"], number>> = { unauthenticated: 401, forbidden: 403, not_found: 404, invalid: 400 };

/** Multipart upload: workspaceId, file, and the dimensions the browser measured. */
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ code: "invalid", message: "No file received." }, { status: 400 });
  // Read the body first: the API call itself must run without awaiting in between.
  const data = Buffer.from(await file.arrayBuffer());
  try {
    const item = await runAs(userId, () =>
      uploadMedia(
        String(form.get("workspaceId") ?? ""),
        { name: file.name, mimeType: file.type, data },
        { width: Number(form.get("width")), height: Number(form.get("height")), durationSec: Number(form.get("durationSec")) || undefined },
      ),
    );
    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ code: e.code, message: e.message }, { status: STATUS[e.code] ?? 400 });
    throw e;
  }
}
