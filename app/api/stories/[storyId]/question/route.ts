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

  let body: { answer?: string };
  try {
    body = (await request.json()) as { answer?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const answer = body.answer?.trim() ?? "";
  if (!answer) {
    return NextResponse.json({ error: "Answer cannot be empty." }, { status: 400 });
  }

  const result = await updateDb((db) => {
    const story = db.stories.find((entry) => entry.id === storyId);
    if (!story) {
      return { error: "not_found" } as const;
    }
    if (!story.question) {
      return { error: "no_question" } as const;
    }

    const existing = story.question.answers.find(
      (entry) => entry.userId === currentUser.id,
    );
    if (existing) {
      existing.text = answer;
      existing.createdAt = new Date().toISOString();
    } else {
      story.question.answers.push({
        id: createId("ans"),
        userId: currentUser.id,
        text: answer,
        createdAt: new Date().toISOString(),
      });
    }
    return { storyId: story.id } as const;
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: "Unable to answer this question." },
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
