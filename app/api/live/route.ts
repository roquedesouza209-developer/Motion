import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";

type LiveSessionDto = {
  id: string;
  title: string;
  createdAt: string;
  viewerCount: number;
  isHost: boolean;
  isViewer: boolean;
  host: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  };
};

type CreateLiveBody = {
  title?: string;
};

const toSessionDto = ({
  session,
  host,
  currentUserId,
}: {
  session: { id: string; hostId: string; title: string; createdAt: string; viewerIds: string[] };
  host: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  };
  currentUserId: string;
}): LiveSessionDto => {
  const viewerCount = new Set(session.viewerIds).size;
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    viewerCount,
    isHost: session.hostId === currentUserId,
    isViewer: session.viewerIds.includes(currentUserId),
    host: {
      id: host.id,
      name: host.name,
      handle: `@${host.handle}`,
      avatarGradient: host.avatarGradient,
      avatarUrl: host.avatarUrl,
    },
  };
};

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));

  const sessions = db.liveSessions
    .filter((session) => !session.endedAt)
    .map((session) => {
      const host = usersById.get(session.hostId);
      if (!host) {
        return null;
      }
      return toSessionDto({ session, host, currentUserId: user.id });
    })
    .filter((value): value is LiveSessionDto => Boolean(value));

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateLiveBody = {};
  try {
    body = (await request.json()) as CreateLiveBody;
  } catch {
    body = {};
  }

  const titleInput = body.title?.trim() ?? "";

  const result = await updateDb((db) => {
    const existing = db.liveSessions.find(
      (session) => session.hostId === user.id && !session.endedAt,
    );

    if (existing) {
      if (titleInput) {
        existing.title = titleInput;
      }
      if (!existing.viewerIds.includes(user.id)) {
        existing.viewerIds.push(user.id);
      }
      return { session: existing };
    }

    const session = {
      id: createId("liv"),
      hostId: user.id,
      title: titleInput || `${user.name} is live`,
      createdAt: new Date().toISOString(),
      viewerIds: [user.id],
    };
    db.liveSessions.push(session);
    return { session };
  });

  const dto = toSessionDto({
    session: result.session,
    host: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatarGradient: user.avatarGradient,
      avatarUrl: user.avatarUrl,
    },
    currentUserId: user.id,
  });

  return NextResponse.json({ session: dto });
}
