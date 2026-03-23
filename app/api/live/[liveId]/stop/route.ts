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

    if (!session) {
      return null;
    }

    if (session.hostId !== user.id) {
      return { error: "forbidden" } as const;
    }

    session.endedAt = new Date().toISOString();
    return { ok: true } as const;
  });

  if (!result) {
    return NextResponse.json({ error: "Live session not found." }, { status: 404 });
  }

  if ("error" in result) {
    return NextResponse.json({ error: "Only the host can end this live." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
