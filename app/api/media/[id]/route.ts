import { NextResponse, type NextRequest } from "next/server";
import { readMediaFile, runAs } from "@/lib/data/api";
import { ApiError } from "@/lib/data/errors";
import { currentUserId } from "@/lib/server/session";

/** Serves an uploaded file to members of its workspace only. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  try {
    const file = runAs(userId, () => readMediaFile(id));
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return new NextResponse(e.message, { status: e.code === "unauthenticated" ? 401 : 404 });
    throw e;
  }
}
