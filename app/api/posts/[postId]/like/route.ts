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
      return null;
    }

    const alreadyLiked = post.likedBy.includes(user.id);
    post.likedBy = alreadyLiked
      ? post.likedBy.filter((id) => id !== user.id)
      : [...post.likedBy, user.id];

    return {
      liked: !alreadyLiked,
      likes: post.likedBy.length,
    };
  });

  if (!result) {
    return NextResponse.json({ error: "Moment not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
