import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import type { RouteContext } from "@/lib/server/route-context";

type WatchBody = {
  ms?: number;
};

export async function POST(
  request: Request,
  context: RouteContext<{ postId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WatchBody;
  try {
    body = (await request.json()) as WatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const ms = typeof body.ms === "number" && Number.isFinite(body.ms) ? body.ms : 0;
  const clampedMs = Math.max(0, Math.min(ms, 15 * 60_000));

  if (clampedMs <= 0) {
    return NextResponse.json({ error: "Watch time must be positive." }, { status: 400 });
  }

  const { postId } = await context.params;
  const result = await updateDb((db) => {
    const post = db.posts.find((entry) => entry.id === postId);
    if (!post) {
      return { error: "not_found" } as const;
    }

    post.watchTimeMs = (post.watchTimeMs ?? 0) + clampedMs;
    const estimatedViewsFromWatch = Math.max(
      post.viewCount ?? 0,
      Math.round(post.watchTimeMs / 7000),
    );
    post.viewCount = estimatedViewsFromWatch;
    return { watchTimeMs: post.watchTimeMs, viewCount: post.viewCount } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({
    watchTimeMs: result.watchTimeMs,
    viewCount: result.viewCount,
  });
}
