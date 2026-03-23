import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { formatRelativeTime } from "@/lib/server/format";

type RouteContext = {
  params: Promise<{
    liveId: string;
  }>;
};

type CreateLiveCommentBody = {
  text?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { liveId } = await context.params;
  let body: CreateLiveCommentBody = {};

  try {
    body = (await request.json()) as CreateLiveCommentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";

  if (text.length < 1) {
    return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  }

  if (text.length > 220) {
    return NextResponse.json(
      { error: "Comment must be 220 characters or less." },
      { status: 400 },
    );
  }

  const result = await updateDb((db) => {
    const session = db.liveSessions.find((candidate) => candidate.id === liveId);

    if (!session || session.endedAt) {
      return null;
    }

    const comment = {
      id: createId("livc"),
      liveId,
      userId: user.id,
      text,
      createdAt: new Date().toISOString(),
    };

    db.liveComments.push(comment);
    return { comment };
  });

  if (!result) {
    return NextResponse.json({ error: "Live session not found." }, { status: 404 });
  }

  const db = await readDb();
  const author = db.users.find((candidate) => candidate.id === user.id);

  return NextResponse.json({
    comment: {
      id: result.comment.id,
      author: author?.name ?? user.name,
      handle: `@${author?.handle ?? user.handle}`,
      avatarGradient:
        author?.avatarGradient ?? "linear-gradient(135deg, #94a3b8, #64748b)",
      avatarUrl: author?.avatarUrl,
      text: result.comment.text,
      createdAt: result.comment.createdAt,
      time: formatRelativeTime(result.comment.createdAt),
    },
  });
}
