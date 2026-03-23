import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;

  const result = await updateDb((db) => {
    const post = db.posts.find((candidate) => candidate.id === postId);

    if (!post) {
      return { type: "missing" as const };
    }

    if (post.userId !== user.id) {
      return { type: "forbidden" as const };
    }

    post.archivedAt = new Date().toISOString();
    post.deletedAt = undefined;
    return { type: "archived" as const };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;

  const result = await updateDb((db) => {
    const post = db.posts.find((candidate) => candidate.id === postId);

    if (!post) {
      return { type: "missing" as const };
    }

    if (post.userId !== user.id) {
      return { type: "forbidden" as const };
    }

    post.archivedAt = undefined;
    return { type: "unarchived" as const };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
