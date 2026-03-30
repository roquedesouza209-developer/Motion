import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ highlightId: string }> },
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { highlightId } = await context.params;

  const result = await updateDb((db) => {
    const highlight = db.moveHighlights.find((item) => item.id === highlightId);

    if (!highlight) {
      return { type: "missing" as const };
    }

    if (highlight.userId !== user.id) {
      return { type: "forbidden" as const };
    }

    db.moveHighlights = db.moveHighlights.filter((item) => item.id !== highlightId);
    return { type: "deleted" as const };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Highlight not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "You can only delete your own highlights." }, { status: 403 });
  }

  return NextResponse.json({ success: true });
}
