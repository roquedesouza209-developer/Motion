import { NextResponse } from "next/server";

import { DEFAULT_PROFILE_ACCENT, isProfileAccent } from "@/lib/profile-styles";
import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapMoveHighlightToDto } from "@/lib/server/format";

type CreateHighlightBody = {
  title?: string;
  storyIds?: string[];
  accent?: string;
};

function normalizeStoryIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTarget = url.searchParams.get("user")?.trim() ?? "";
  const currentUser = await getAuthUser(request);
  const db = await readDb();

  const normalizedTarget = rawTarget.replace(/^@/, "").toLowerCase();
  const user = rawTarget
    ? db.users.find(
        (candidate) =>
          candidate.id === rawTarget ||
          candidate.handle.toLowerCase() === normalizedTarget,
      )
    : currentUser;

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const highlights = db.moveHighlights
    .filter((highlight) => highlight.userId === user.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .map((highlight) => mapMoveHighlightToDto(highlight));

  return NextResponse.json({ highlights });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateHighlightBody;

  try {
    body = (await request.json()) as CreateHighlightBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const storyIds = normalizeStoryIds(body.storyIds);
  const accent = body.accent;

  if (title.length < 2) {
    return NextResponse.json(
      { error: "Highlight title must be at least 2 characters." },
      { status: 400 },
    );
  }

  if (storyIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one Move for the highlight." },
      { status: 400 },
    );
  }

  if (accent !== undefined && !isProfileAccent(accent)) {
    return NextResponse.json({ error: "Invalid highlight accent." }, { status: 400 });
  }

  const result = await updateDb((db) => {
    const stories = db.stories.filter(
      (story) => story.userId === user.id && storyIds.includes(story.id),
    );

    if (stories.length === 0) {
      return { type: "missing" as const };
    }

    const highlight = {
      id: createId("hgh"),
      userId: user.id,
      title,
      accent: accent && isProfileAccent(accent) ? accent : user.profileAccent ?? DEFAULT_PROFILE_ACCENT,
      items: stories
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((story) => ({
          id: createId("hgi"),
          sourceStoryId: story.id,
          caption: story.caption,
          gradient: story.gradient,
          media: story.media,
          mediaUrl: story.mediaUrl,
          mediaType: story.mediaType,
          createdAt: story.createdAt,
        })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.moveHighlights.unshift(highlight);

    return { type: "created" as const, highlight: mapMoveHighlightToDto(highlight) };
  });

  if (result.type === "missing") {
    return NextResponse.json(
      { error: "Those Moves are no longer available for highlighting." },
      { status: 404 },
    );
  }

  return NextResponse.json({ highlight: result.highlight }, { status: 201 });
}
