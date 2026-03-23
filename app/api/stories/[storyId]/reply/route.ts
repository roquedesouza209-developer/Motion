import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapStoryToDto } from "@/lib/server/format";
import type { RouteContext } from "@/lib/server/route-context";

export async function POST(
  request: Request,
  context: RouteContext<{ storyId: string }>,
) {
  const currentUser = await getAuthUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId } = await context.params;

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });
  }

  if (text.length > 240) {
    return NextResponse.json(
      { error: "Replies must be 240 characters or less." },
      { status: 400 },
    );
  }

  const result = await updateDb((db) => {
    const story = db.stories.find((entry) => entry.id === storyId);
    if (!story) {
      return { error: "not_found" } as const;
    }

    if (!story.replies) {
      story.replies = [];
    }

    story.replies.push({
      id: createId("rpl"),
      userId: currentUser.id,
      text,
      createdAt: new Date().toISOString(),
    });

    if (story.userId !== currentUser.id) {
      db.notifications.push({
        id: createId("not"),
        userId: story.userId,
        actorId: currentUser.id,
        type: "story_reply",
        storyId: story.id,
        text,
        createdAt: new Date().toISOString(),
      });
    }

    return { storyId: story.id } as const;
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: "Unable to reply to this story." },
      { status: 400 },
    );
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((user) => [user.id, user]));
  const story = db.stories.find((entry) => entry.id === storyId);
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({
    story: mapStoryToDto({
      story,
      usersById,
      currentUserId: currentUser.id,
    }),
  });
}
