import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapStoryToDto } from "@/lib/server/format";
import type { MediaItem, StoryRecord } from "@/lib/server/types";

type CreateStoryBody = {
  caption?: string;
  gradient?: string;
  media?: MediaItem[];
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

const DEFAULT_STORY_GRADIENTS = [
  "linear-gradient(135deg, #ff8f6b, #ff5f6d)",
  "linear-gradient(135deg, #00a3a3, #00b1ff)",
  "linear-gradient(135deg, #ffc048, #ff6b6b)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #ff9a9e, #fbc2eb)",
];

export async function GET(request: Request) {
  const currentUser = await getAuthUser(request);
  const db = await readDb();
  const usersById = new Map(db.users.map((user) => [user.id, user]));

  const stories = [...db.stories]
    .sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    )
    .map((story) =>
      mapStoryToDto({
        story,
        usersById,
        currentUserId: currentUser?.id ?? null,
      }),
    );

  return NextResponse.json({ stories });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateStoryBody;

  try {
    body = (await request.json()) as CreateStoryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const caption = body.caption?.trim() ?? "";
  const mediaUrl = body.mediaUrl?.trim() || undefined;
  const mediaType =
    body.mediaType === "image" || body.mediaType === "video"
      ? body.mediaType
      : undefined;
  const mediaItems: MediaItem[] = [];

  if (Array.isArray(body.media)) {
    for (const entry of body.media) {
      if (!entry || typeof entry !== "object") {
        return NextResponse.json(
          { error: "media items must include url and type." },
          { status: 400 },
        );
      }
      const url = (entry as MediaItem).url;
      const type = (entry as MediaItem).type;
      if (typeof url !== "string" || (type !== "image" && type !== "video")) {
        return NextResponse.json(
          { error: "media items must include url and type." },
          { status: 400 },
        );
      }
      mediaItems.push({ url, type });
    }
  }

  if (mediaItems.length === 0 && mediaUrl) {
    if (!mediaType) {
      return NextResponse.json(
        { error: "mediaType is required when mediaUrl is provided." },
        { status: 400 },
      );
    }
    mediaItems.push({ url: mediaUrl, type: mediaType });
  }

  if (!caption && mediaItems.length === 0) {
    return NextResponse.json(
      { error: "Upload a photo/video or add a move caption." },
      { status: 400 },
    );
  }

  if (caption && caption.length < 4 && mediaItems.length === 0) {
    return NextResponse.json(
      { error: "Move caption must be at least 4 characters." },
      { status: 400 },
    );
  }

  if (mediaItems.some((item) => !item.url.startsWith("/uploads/"))) {
    return NextResponse.json(
      { error: "mediaUrl must point to /uploads." },
      { status: 400 },
    );
  }

  const hasImage = mediaItems.some((item) => item.type === "image");
  const hasVideo = mediaItems.some((item) => item.type === "video");
  if (hasImage && hasVideo) {
    return NextResponse.json(
      { error: "Moves can only include photos or videos, not both." },
      { status: 400 },
    );
  }

  const created = await updateDb((db) => {
    const gradient =
      body.gradient ??
      DEFAULT_STORY_GRADIENTS[db.stories.length % DEFAULT_STORY_GRADIENTS.length];
    const now = new Date();
    const primaryMedia = mediaItems[0];
    const story: StoryRecord = {
      id: createId("sty"),
      userId: user.id,
      caption,
      gradient,
      media: mediaItems.length > 0 ? mediaItems : undefined,
      mediaUrl: primaryMedia?.url,
      mediaType: primaryMedia?.type,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      seenBy: [user.id],
    };

    db.stories.push(story);
    return story;
  });

  const usersById = new Map([[user.id, user]]);
  const dto = mapStoryToDto({
    story: created,
    usersById,
    currentUserId: user.id,
  });

  return NextResponse.json({ story: dto }, { status: 201 });
}
