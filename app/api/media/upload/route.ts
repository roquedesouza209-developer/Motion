import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { storeUploadedMedia } from "@/lib/server/media";
import type { PostKind } from "@/lib/server/types";

export const runtime = "nodejs";

function normalizeExpectedKind(input: FormDataEntryValue | null): PostKind | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  if (input === "Photo" || input === "Reel") {
    return input;
  }

  return undefined;
}

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
  const expectedKind = normalizeExpectedKind(formData.get("kind"));

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "Upload field `file` is required." }, { status: 400 });
  }

  try {
    const stored = await storeUploadedMedia({
      file: fileEntry,
      expectedKind,
    });
    return NextResponse.json(stored, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to store uploaded media.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
