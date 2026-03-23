import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import { isPostReleased, mapPostToDto } from "@/lib/server/format";
import type { PostRecord, UserRecord } from "@/lib/server/types";

type RouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

type CapsuleBody = {
  visibleAt?: string;
};

type CapsuleUpdateResult =
  | { type: "updated"; post: PostRecord; author?: UserRecord }
  | { type: "missing" }
  | { type: "forbidden" }
  | { type: "inactive" }
  | { type: "live" };

function toPostResponse(result: CapsuleUpdateResult, currentUserId: string) {
  if (result.type !== "updated") {
    return null;
  }

  return mapPostToDto({
    post: result.post,
    usersById: new Map(
      result.author ? [[result.author.id, result.author]] : [],
    ),
    currentUserId,
  });
}

function buildErrorResponse(result: Exclude<CapsuleUpdateResult, { type: "updated"; post: PostRecord; author?: UserRecord }>) {
  if (result.type === "missing") {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (result.type === "inactive") {
    return NextResponse.json(
      { error: "Only active time capsules can be changed." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { error: "This time capsule is already live." },
    { status: 409 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CapsuleBody;

  try {
    body = (await request.json()) as CapsuleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const rawVisibleAt = body.visibleAt?.trim();

  if (!rawVisibleAt) {
    return NextResponse.json({ error: "Choose a valid future date." }, { status: 400 });
  }

  const releaseAt = new Date(rawVisibleAt).getTime();

  if (Number.isNaN(releaseAt)) {
    return NextResponse.json({ error: "Choose a valid future date." }, { status: 400 });
  }

  if (releaseAt <= Date.now()) {
    return NextResponse.json(
      { error: "Time capsule posts must open in the future." },
      { status: 400 },
    );
  }

  const { postId } = await context.params;
  const visibleAt = new Date(releaseAt).toISOString();
  const result = await updateDb<CapsuleUpdateResult>((db) => {
    const post = db.posts.find((candidate) => candidate.id === postId);

    if (!post) {
      return { type: "missing" };
    }

    if (post.userId !== user.id) {
      return { type: "forbidden" };
    }

    if (post.deletedAt || post.archivedAt) {
      return { type: "inactive" };
    }

    if (!post.visibleAt || isPostReleased(post)) {
      return { type: "live" };
    }

    post.visibleAt = visibleAt;
    const author = db.users.find((candidate) => candidate.id === post.userId);

    return { type: "updated", post: { ...post }, author };
  });

  if (result.type !== "updated") {
    return buildErrorResponse(result);
  }

  return NextResponse.json({ post: toPostResponse(result, user.id) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;
  const result = await updateDb<CapsuleUpdateResult>((db) => {
    const post = db.posts.find((candidate) => candidate.id === postId);

    if (!post) {
      return { type: "missing" };
    }

    if (post.userId !== user.id) {
      return { type: "forbidden" };
    }

    if (post.deletedAt || post.archivedAt) {
      return { type: "inactive" };
    }

    if (!post.visibleAt || isPostReleased(post)) {
      return { type: "live" };
    }

    post.visibleAt = undefined;
    const author = db.users.find((candidate) => candidate.id === post.userId);

    return { type: "updated", post: { ...post }, author };
  });

  if (result.type !== "updated") {
    return buildErrorResponse(result);
  }

  return NextResponse.json({ post: toPostResponse(result, user.id) });
}
