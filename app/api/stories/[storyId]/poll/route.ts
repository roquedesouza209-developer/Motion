import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
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

  let body: { optionIndex?: number };
  try {
    body = (await request.json()) as { optionIndex?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const optionIndex =
    typeof body.optionIndex === "number" ? body.optionIndex : NaN;
  if (!Number.isFinite(optionIndex)) {
    return NextResponse.json({ error: "Option index is required." }, { status: 400 });
  }

  const result = await updateDb((db) => {
    const story = db.stories.find((entry) => entry.id === storyId);
    if (!story) {
      return { error: "not_found" } as const;
    }
    if (!story.poll) {
      return { error: "no_poll" } as const;
    }
    if (optionIndex < 0 || optionIndex >= story.poll.options.length) {
      return { error: "invalid_option" } as const;
    }

    story.poll.votes = story.poll.votes.filter(
      (vote) => vote.userId !== currentUser.id,
    );
    story.poll.votes.push({ userId: currentUser.id, optionIndex });
    return { storyId: story.id } as const;
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: "Unable to vote on this poll." },
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
