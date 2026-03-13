import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapPostToDto } from "@/lib/server/format";
import { rankDiscoverPosts } from "@/lib/server/ranking";
import type { FeedScope, MediaItem, PostKind, PostRecord } from "@/lib/server/types";

type CreatePostBody = {
  kind?: PostKind;
  caption?: string;
  location?: string;
  scope?: FeedScope;
  gradient?: string;
  media?: MediaItem[];
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

function normalizeMediaItems({
  media,
  mediaUrl,
  mediaType,
}: {
  media?: MediaItem[];
  mediaUrl?: string;
  mediaType?: "image" | "video";
}): { items?: MediaItem[]; error?: string } {
  const items: MediaItem[] = [];

  if (Array.isArray(media)) {
    for (const entry of media) {
      if (!entry || typeof entry !== "object") {
        return { error: "media items must include url and type." };
      }
      const url = (entry as MediaItem).url;
      const type = (entry as MediaItem).type;

      if (typeof url !== "string" || (type !== "image" && type !== "video")) {
        return { error: "media items must include url and type." };
      }

      items.push({ url, type });
    }
  }

  if (items.length === 0 && mediaUrl) {
    if (!mediaType) {
      return { error: "mediaType is required when mediaUrl is provided." };
    }
    items.push({ url: mediaUrl, type: mediaType });
  }

  return { items: items.length > 0 ? items : undefined };
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
  const normalizedMedia = normalizeMediaItems({
    media: body.media,
    mediaUrl,
    mediaType,
  });

  if (caption.length < 8) {
    return NextResponse.json(
      { error: "Caption must be at least 8 characters." },
      { status: 400 },
    );
  }

  if (normalizedMedia.error) {
    return NextResponse.json({ error: normalizedMedia.error }, { status: 400 });
  }

  const mediaItems = normalizedMedia.items;

  if (mediaItems?.some((item) => !item.url.startsWith("/uploads/"))) {
    return NextResponse.json(
      { error: "mediaUrl must point to /uploads." },
      { status: 400 },
    );
  }

  if (kind === "Photo" && mediaItems?.some((item) => item.type === "video")) {
    return NextResponse.json(
      { error: "Photo posts cannot include video media." },
      { status: 400 },
    );
  }

  if (kind === "Reel" && mediaItems?.some((item) => item.type === "image")) {
    return NextResponse.json(
      { error: "Reel posts cannot include image media." },
      { status: 400 },
    );
  }

  const created = await updateDb((db) => {
    const gradient =
      body.gradient ??
      DEFAULT_POST_GRADIENTS[db.posts.length % DEFAULT_POST_GRADIENTS.length];
    const primaryMedia = mediaItems?.[0];
    const newPost: PostRecord = {
      id: createId("pst"),
      userId: user.id,
      scope,
      kind,
      caption,
      location,
      gradient,
      media: mediaItems,
      mediaUrl: primaryMedia?.url,
      mediaType: primaryMedia?.type,
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
