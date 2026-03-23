import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { storeUploadedChatMedia } from "@/lib/server/media";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data payload." }, { status: 400 });
  }

  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "Upload field `file` is required." }, { status: 400 });
  }

  try {
    const durationEntry = formData.get("durationMs");
    const durationMs =
      typeof durationEntry === "string" && durationEntry.trim().length > 0
        ? Number(durationEntry)
        : undefined;
    const stored = await storeUploadedChatMedia({ file: fileEntry });

    return NextResponse.json(
      {
        attachment: {
          url: stored.mediaUrl,
          type: stored.mediaType,
          mimeType: stored.mimeType,
          name: stored.name,
          durationMs:
            typeof durationMs === "number" && Number.isFinite(durationMs)
              ? Math.max(0, Math.round(durationMs))
              : undefined,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to store chat media.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
