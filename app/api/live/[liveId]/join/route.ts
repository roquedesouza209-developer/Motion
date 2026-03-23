import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type RouteContext = {
  params: Promise<{
    liveId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { liveId } = await context.params;

  const result = await updateDb((db) => {
    const session = db.liveSessions.find((candidate) => candidate.id === liveId);

    if (!session || session.endedAt) {
      return null;
    }

    if (!session.viewerIds.includes(user.id)) {
      session.viewerIds.push(user.id);
    }

    return { viewerCount: new Set(session.viewerIds).size };
  });

  if (!result) {
    return NextResponse.json({ error: "Live session not found." }, { status: 404 });
  }

  return NextResponse.json({ viewerCount: result.viewerCount });
}
