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

  let body: { emoji?: string };
  try {
    body = (await request.json()) as { emoji?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const emoji = body.emoji?.trim() ?? "";
  if (!emoji) {
    return NextResponse.json({ error: "Emoji is required." }, { status: 400 });
  }

  const result = await updateDb((db) => {
    const story = db.stories.find((entry) => entry.id === storyId);
    if (!story) {
      return { error: "not_found" } as const;
    }
    if (!story.emojiReactions || story.emojiReactions.length === 0) {
      return { error: "no_reactions" } as const;
    }

    const reaction = story.emojiReactions.find((entry) => entry.emoji === emoji);
    if (!reaction) {
      return { error: "invalid_emoji" } as const;
    }

    const alreadyReacted = reaction.userIds.includes(currentUser.id);
    if (alreadyReacted) {
      reaction.userIds = reaction.userIds.filter((id) => id !== currentUser.id);
    } else {
      reaction.userIds.push(currentUser.id);
    }

    if (!alreadyReacted && story.userId !== currentUser.id) {
      db.notifications.push({
        id: createId("not"),
        userId: story.userId,
        actorId: currentUser.id,
        type: "story_reaction",
        storyId: story.id,
        emoji,
        createdAt: new Date().toISOString(),
      });
    }

    return { storyId: story.id } as const;
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: "Unable to react to this story." },
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
