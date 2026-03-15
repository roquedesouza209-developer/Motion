import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  const result = await updateDb((db) => {
    const postIndex = db.posts.findIndex((candidate) => candidate.id === postId);

    if (postIndex < 0) {
      return { type: "missing" as const };
    }

    const post = db.posts[postIndex];

    if (post.userId !== user.id) {
      return { type: "forbidden" as const };
    }

    if (!force && !post.deletedAt) {
      post.deletedAt = new Date().toISOString();
      return { type: "soft_deleted" as const };
    }

    db.posts.splice(postIndex, 1);
    db.comments = db.comments.filter((comment) => comment.postId !== postId);

    return { type: "deleted" as const };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
