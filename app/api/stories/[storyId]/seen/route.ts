import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type RouteContext = {
  params: Promise<{
    storyId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId } = await context.params;

  const updated = await updateDb((db) => {
    const story = db.stories.find((candidate) => candidate.id === storyId);

    if (!story) {
      return false;
    }

    if (!story.seenBy.includes(user.id)) {
      story.seenBy.push(user.id);
    }

    return true;
  });

  if (!updated) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ seen: true });
}
