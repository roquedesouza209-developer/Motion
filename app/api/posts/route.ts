import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapPostToDto } from "@/lib/server/format";
import { rankDiscoverPosts } from "@/lib/server/ranking";
import type { FeedScope, PostKind, PostRecord } from "@/lib/server/types";

type CreatePostBody = {
  kind?: PostKind;
  caption?: string;
  location?: string;
  scope?: FeedScope;
  gradient?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

const DEFAULT_POST_GRADIENTS = [
  "linear-gradient(145deg, #f6d365, #fda085)",
  "linear-gradient(145deg, #96fbc4, #f9f586)",
  "linear-gradient(145deg, #84fab0, #8fd3f4)",
  "linear-gradient(145deg, #fbc2eb, #a6c1ee)",
];

function normalizeScope(input: string | null): FeedScope {
  if (input === "following") {
    return "following";
  }

  return "discover";
}

function normalizeKind(input: string | undefined): PostKind {
  return input === "Reel" ? "Reel" : "Photo";
}

function normalizeMediaType(input: string | undefined): "image" | "video" | undefined {
  if (input === "image" || input === "video") {
    return input;
  }

  return undefined;
}

export async function GET(request: Request) {
  const feedScope = normalizeScope(new URL(request.url).searchParams.get("scope"));
  const currentUser = await getAuthUser(request);
  const currentUserId = currentUser?.id ?? null;
  const db = await readDb();
  const usersById = new Map(db.users.map((user) => [user.id, user]));
  const followSet = new Set(
    db.follows
      .filter((follow) => follow.followerId === currentUserId)
      .map((follow) => follow.followingId),
  );

  if (currentUserId) {
    followSet.add(currentUserId);
  }

  const orderedPosts =
    feedScope === "following"
      ? db.posts
          .filter((post) => {
            if (!currentUserId) {
              return post.scope === "following";
            }

            return followSet.has(post.userId);
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
      : rankDiscoverPosts({
          db,
          currentUserId,
        });

  const data = orderedPosts
    .map((post) => mapPostToDto({ post, usersById, currentUserId }));

  return NextResponse.json({ posts: data });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePostBody;

  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const caption = body.caption?.trim() ?? "";
  const location = body.location?.trim() ?? "";
  const scope = body.scope === "following" ? "following" : "discover";
  const kind = normalizeKind(body.kind);
  const mediaUrl = body.mediaUrl?.trim() || undefined;
  const mediaType = normalizeMediaType(body.mediaType);

  if (caption.length < 8) {
    return NextResponse.json(
      { error: "Caption must be at least 8 characters." },
      { status: 400 },
    );
  }

  if (mediaUrl && !mediaType) {
    return NextResponse.json(
      { error: "mediaType is required when mediaUrl is provided." },
      { status: 400 },
    );
  }

  if (mediaUrl && !mediaUrl.startsWith("/uploads/")) {
    return NextResponse.json(
      { error: "mediaUrl must point to /uploads." },
      { status: 400 },
    );
  }

  if (kind === "Photo" && mediaType === "video") {
    return NextResponse.json(
      { error: "Photo posts cannot reference video media." },
      { status: 400 },
    );
  }

  if (kind === "Reel" && mediaType === "image") {
    return NextResponse.json(
      { error: "Reel posts cannot reference image media." },
      { status: 400 },
    );
  }

  const created = await updateDb((db) => {
    const gradient =
      body.gradient ??
      DEFAULT_POST_GRADIENTS[db.posts.length % DEFAULT_POST_GRADIENTS.length];
    const newPost: PostRecord = {
      id: createId("pst"),
      userId: user.id,
      scope,
      kind,
      caption,
      location,
      gradient,
      mediaUrl,
      mediaType,
      likedBy: [user.id],
      savedBy: [],
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };

    db.posts.push(newPost);
    return newPost;
  });

  const usersById = new Map([[user.id, user]]);
  const dto = mapPostToDto({
    post: created,
    usersById,
    currentUserId: user.id,
  });

  return NextResponse.json({ post: dto }, { status: 201 });
}
