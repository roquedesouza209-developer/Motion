import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import type { RouteContext } from "@/lib/server/route-context";

export async function POST(
  request: Request,
  context: RouteContext<{ postId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;
  const result = await updateDb((db) => {
    const post = db.posts.find((entry) => entry.id === postId);
    if (!post) {
      return { error: "not_found" } as const;
    }

    post.shareCount = (post.shareCount ?? 0) + 1;
    return { shares: post.shareCount } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ shares: result.shares });
}
