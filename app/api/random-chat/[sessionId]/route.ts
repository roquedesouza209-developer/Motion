import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapRandomChatSessionToDto } from "@/lib/server/format";
import type { RouteContext } from "@/lib/server/route-context";
import { getActiveRandomChatSession } from "@/lib/server/random-chat";
import type { CallSignalType } from "@/lib/server/types";

type RandomChatBody =
  | {
      action: "join";
    }
  | {
      action: "signal";
      signalType?: CallSignalType;
      payload?: unknown;
      toUserId?: string;
    }
  | {
      action: "media";
      audioEnabled?: boolean;
      videoEnabled?: boolean;
    }
  | {
      action: "skip" | "leave";
    }
  | {
      action: "report";
      reason?: string;
    };

export async function GET(
  request: Request,
  context: RouteContext<{ sessionId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const db = await readDb();
  const session = db.randomChatSessions.find(
    (candidate) =>
      candidate.id === sessionId && candidate.participantIds.includes(user.id),
  );

  if (!session) {
    return NextResponse.json({ error: "Random chat not found." }, { status: 404 });
  }

  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));

  return NextResponse.json({
    session: mapRandomChatSessionToDto({
      session,
      usersById,
      currentUserId: user.id,
    }),
  });
}

export async function POST(
  request: Request,
  context: RouteContext<{ sessionId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RandomChatBody;

  try {
    body = (await request.json()) as RandomChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { sessionId } = await context.params;

  const result = await updateDb((db) => {
    const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
    const session = db.randomChatSessions.find(
      (candidate) =>
        candidate.id === sessionId && candidate.participantIds.includes(user.id),
    );

    if (!session) {
      return { type: "missing" as const };
    }

    const now = new Date().toISOString();

    if (body.action === "join") {
      session.participants = session.participants.map((participant) =>
        participant.userId === user.id
          ? {
              ...participant,
              joinedAt: participant.joinedAt ?? now,
            }
          : participant,
      );
      session.updatedAt = now;
    } else if (body.action === "signal") {
      if (
        body.signalType !== "offer" &&
        body.signalType !== "answer" &&
        body.signalType !== "ice"
      ) {
        return { type: "invalid_signal_type" as const };
      }

      if (
        typeof body.toUserId !== "string" ||
        !session.participantIds.includes(body.toUserId) ||
        body.toUserId === user.id
      ) {
        return { type: "invalid_signal_target" as const };
      }

      session.signals.push({
        id: createId("rsg"),
        fromUserId: user.id,
        toUserId: body.toUserId,
        type: body.signalType,
        payload: body.payload,
        createdAt: now,
      });
      session.updatedAt = now;

      if (body.signalType === "answer") {
        session.status = "active";
      }
    } else if (body.action === "media") {
      session.participants = session.participants.map((participant) =>
        participant.userId === user.id
          ? {
              ...participant,
              audioEnabled:
                typeof body.audioEnabled === "boolean"
                  ? body.audioEnabled
                  : participant.audioEnabled,
              videoEnabled:
                typeof body.videoEnabled === "boolean"
                  ? body.videoEnabled
                  : participant.videoEnabled,
            }
          : participant,
      );
      session.updatedAt = now;
    } else if (body.action === "skip" || body.action === "leave") {
      session.status = "ended";
      session.endedAt = now;
      session.endedById = user.id;
      session.endedReason = body.action === "skip" ? "skip" : "left";
      session.updatedAt = now;
      db.randomChatQueue = db.randomChatQueue.filter((entry) => entry.userId !== user.id);
    } else if (body.action === "report") {
      const otherParticipantId = session.participantIds.find(
        (participantId) => participantId !== user.id,
      );

      if (!otherParticipantId) {
        return { type: "missing_other_user" as const };
      }

      db.randomChatReports.unshift({
        id: createId("rrp"),
        sessionId: session.id,
        reporterId: user.id,
        reportedUserId: otherParticipantId,
        reason:
          typeof body.reason === "string" && body.reason.trim()
            ? body.reason.trim()
            : undefined,
        createdAt: now,
      });
      session.status = "ended";
      session.endedAt = now;
      session.endedById = user.id;
      session.endedReason = "report";
      session.updatedAt = now;
      db.randomChatQueue = db.randomChatQueue.filter((entry) => entry.userId !== user.id);
    }

    return {
      type: "ok" as const,
      session:
        getActiveRandomChatSession([session], user.id) || !session.endedAt
          ? mapRandomChatSessionToDto({
              session,
              usersById,
              currentUserId: user.id,
            })
          : mapRandomChatSessionToDto({
              session,
              usersById,
              currentUserId: user.id,
            }),
    };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Random chat not found." }, { status: 404 });
  }

  if (result.type === "invalid_signal_type") {
    return NextResponse.json({ error: "Invalid signal type." }, { status: 400 });
  }

  if (result.type === "invalid_signal_target") {
    return NextResponse.json({ error: "Invalid signal target." }, { status: 400 });
  }

  if (result.type === "missing_other_user") {
    return NextResponse.json({ error: "Partner not found." }, { status: 400 });
  }

  return NextResponse.json({ session: result.session });
}
