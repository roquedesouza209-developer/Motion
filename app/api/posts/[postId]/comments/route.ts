import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapCommentToDto } from "@/lib/server/format";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

type CreateCommentBody = {
  text?: string;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;
  const db = await readDb();
  const post = db.posts.find((candidate) => candidate.id === postId);

  if (!post) {
    return NextResponse.json({ error: "Moment not found." }, { status: 404 });
  }

  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
  const comments = db.comments
    .filter((comment) => comment.postId === postId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((comment) =>
      mapCommentToDto({
        comment,
        usersById,
      }),
    );

  return NextResponse.json({
    comments,
    total: Math.max(post.commentCount, comments.length),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;
  let body: CreateCommentBody;

  try {
    body = (await request.json()) as CreateCommentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";

  if (text.length < 1) {
    return NextResponse.json(
      { error: "Comment cannot be empty." },
      { status: 400 },
    );
  }

  if (text.length > 280) {
    return NextResponse.json(
      { error: "Comment must be 280 characters or less." },
      { status: 400 },
    );
  }

  const result = await updateDb((db) => {
    const post = db.posts.find((candidate) => candidate.id === postId);

    if (!post) {
      return null;
    }

    const comment = {
      id: createId("cmt"),
      postId,
      userId: user.id,
      text,
      createdAt: new Date().toISOString(),
    };

    db.comments.push(comment);
    post.commentCount += 1;

    return {
      comment,
      total: post.commentCount,
      usersById: new Map(db.users.map((candidate) => [candidate.id, candidate])),
    };
  });

  if (!result) {
    return NextResponse.json({ error: "Moment not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      comment: mapCommentToDto({
        comment: result.comment,
        usersById: result.usersById,
      }),
      total: result.total,
    },
    { status: 201 },
  );
}
