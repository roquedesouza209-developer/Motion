import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { formatRelativeTime } from "@/lib/server/format";

type RouteContext = {
  params: Promise<{
    liveId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { liveId } = await context.params;
  const db = await readDb();
  const session = db.liveSessions.find((candidate) => candidate.id === liveId);

  if (!session) {
    return NextResponse.json({ error: "Live session not found." }, { status: 404 });
  }

  const host = db.users.find((candidate) => candidate.id === session.hostId);

  if (!host) {
    return NextResponse.json({ error: "Host not found." }, { status: 404 });
  }

  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
  const comments = db.liveComments
    .filter((comment) => comment.liveId === session.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((comment) => {
      const author = usersById.get(comment.userId);
      return {
        id: comment.id,
        author: author?.name ?? "Unknown Creator",
        handle: author ? `@${author.handle}` : "@unknown",
        avatarGradient:
          author?.avatarGradient ?? "linear-gradient(135deg, #94a3b8, #64748b)",
        avatarUrl: author?.avatarUrl,
        text: comment.text,
        createdAt: comment.createdAt,
        time: formatRelativeTime(comment.createdAt),
      };
    });

  const viewerCount = new Set(session.viewerIds).size;

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      viewerCount,
      isHost: session.hostId === user.id,
      isViewer: session.viewerIds.includes(user.id),
      isActive: !session.endedAt,
      host: {
        id: host.id,
        name: host.name,
        handle: `@${host.handle}`,
        avatarGradient: host.avatarGradient,
        avatarUrl: host.avatarUrl,
      },
    },
    comments,
  });
}
