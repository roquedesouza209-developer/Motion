import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { mapCallSessionToDto } from "@/lib/server/format";
import type {
  CallMode,
  CallSessionRecord,
  CallSignalType,
  MessageRecord,
} from "@/lib/server/types";
import type { RouteContext } from "@/lib/server/route-context";

const ACTIVE_CALL_STATUSES = new Set(["ringing", "connecting", "active"]);

function appendCallHistoryMessage({
  conversation,
  messages,
  callId,
  mode,
  senderId,
  text,
  event,
  durationMs,
  createdAt,
}: {
  conversation: {
    id: string;
    participantIds: string[];
    unreadCountByUserId: Record<string, number>;
    updatedAt: string;
  };
  messages: MessageRecord[];
  callId: string;
  mode: CallMode;
  senderId: string;
  text: string;
  event: "started" | "accepted" | "declined" | "ended" | "missed";
  durationMs?: number;
  createdAt: string;
}) {
  if (messages.some((message) => message.callId === callId && message.callEvent === event)) {
    return;
  }

  messages.push({
    id: createId("msg"),
    conversationId: conversation.id,
    senderId,
    text,
    systemType: "call",
    callId,
    callMode: mode,
    callEvent: event,
    callDurationMs:
      typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0
        ? Math.round(durationMs)
        : undefined,
    reactions: [],
    deliveredToIds: [],
    readByIds: [],
    createdAt,
  });
  conversation.updatedAt = createdAt;

  for (const participantId of conversation.participantIds) {
    if (participantId === senderId) {
      conversation.unreadCountByUserId[participantId] = 0;
    } else {
      conversation.unreadCountByUserId[participantId] =
        (conversation.unreadCountByUserId[participantId] ?? 0) + 1;
    }
  }
}

type CallBody =
  | {
      action: "start";
      mode?: CallMode;
    }
  | {
      action: "accept" | "decline" | "end";
      callId?: string;
    }
  | {
      action: "signal";
      callId?: string;
      signalType?: CallSignalType;
      payload?: unknown;
      toUserId?: string;
    }
  | {
      action: "media";
      callId?: string;
      audioEnabled?: boolean;
      videoEnabled?: boolean;
    };

function getActiveConversationCall(
  calls: CallSessionRecord[],
  conversationId: string,
  userId: string,
) {
  return (
    [...calls]
      .filter(
        (candidate) =>
          candidate.conversationId === conversationId &&
          candidate.participantIds.includes(userId) &&
          ACTIVE_CALL_STATUSES.has(candidate.status) &&
          !candidate.endedAt,
      )
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0] ?? null
  );
}

export async function GET(request: Request, context: RouteContext<{ conversationId: string }>) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const db = await readDb();
  const conversation = db.conversations.find((candidate) => candidate.id === conversationId);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (!conversation.participantIds.includes(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = getActiveConversationCall(db.callSessions, conversationId, user.id);
  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));

  return NextResponse.json({
    session: session ? mapCallSessionToDto({ session, usersById, currentUserId: user.id }) : null,
  });
}

export async function POST(
  request: Request,
  context: RouteContext<{ conversationId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CallBody;

  try {
    body = (await request.json()) as CallBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { conversationId } = await context.params;

  const result = await updateDb((db) => {
    const conversation = db.conversations.find((candidate) => candidate.id === conversationId);

    if (!conversation) {
      return { type: "missing" as const };
    }

    if (!conversation.participantIds.includes(user.id)) {
      return { type: "forbidden" as const };
    }

    const otherUserId =
      conversation.participantIds.find((participantId) => participantId !== user.id) ??
      user.id;
    const now = new Date().toISOString();
    const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
    const activeConversationCall = getActiveConversationCall(
      db.callSessions,
      conversationId,
      user.id,
    );

    if (body.action === "start") {
      const mode = body.mode === "voice" || body.mode === "video" ? body.mode : "video";

      if (activeConversationCall) {
        return {
          type: "ok" as const,
          session: mapCallSessionToDto({
            session: activeConversationCall,
            usersById,
            currentUserId: user.id,
          }),
        };
      }

      const blockingCall = db.callSessions.find(
        (candidate) =>
          ACTIVE_CALL_STATUSES.has(candidate.status) &&
          !candidate.endedAt &&
          candidate.conversationId !== conversationId &&
          (candidate.participantIds.includes(user.id) ||
            candidate.participantIds.includes(otherUserId)),
      );

      if (blockingCall) {
        return { type: "busy" as const };
      }

      const session: CallSessionRecord = {
        id: createId("call"),
        conversationId,
        initiatorId: user.id,
        participantIds: [user.id, otherUserId],
        mode,
        status: "ringing",
        participants: [
          {
            userId: user.id,
            joinedAt: now,
            audioEnabled: true,
            videoEnabled: mode === "video",
          },
          {
            userId: otherUserId,
            audioEnabled: true,
            videoEnabled: mode === "video",
          },
        ],
        signals: [],
        createdAt: now,
        updatedAt: now,
      };

      db.callSessions.unshift(session);
      appendCallHistoryMessage({
        conversation,
        messages: db.messages,
        callId: session.id,
        mode,
        senderId: user.id,
        text: `${mode === "video" ? "Video" : "Voice"} call started`,
        event: "started",
        createdAt: now,
      });

      return {
        type: "ok" as const,
        session: mapCallSessionToDto({
          session,
          usersById,
          currentUserId: user.id,
        }),
      };
    }

    const targetCall = db.callSessions.find(
      (candidate) =>
        candidate.id === body.callId &&
        candidate.conversationId === conversationId &&
        candidate.participantIds.includes(user.id),
    );

    if (!targetCall) {
      return { type: "missing_call" as const };
    }

    if (body.action === "accept") {
      targetCall.status = "connecting";
      targetCall.updatedAt = now;
      targetCall.answeredAt = targetCall.answeredAt ?? now;
      targetCall.participants = targetCall.participants.map((participant) =>
        participant.userId === user.id
          ? {
              ...participant,
              joinedAt: participant.joinedAt ?? now,
            }
          : participant,
      );
      appendCallHistoryMessage({
        conversation,
        messages: db.messages,
        callId: targetCall.id,
        mode: targetCall.mode,
        senderId: user.id,
        text: "Call connected",
        event: "accepted",
        createdAt: now,
      });
    } else if (body.action === "decline") {
      targetCall.status = "declined";
      targetCall.updatedAt = now;
      targetCall.endedAt = now;
      targetCall.endedById = user.id;
      appendCallHistoryMessage({
        conversation,
        messages: db.messages,
        callId: targetCall.id,
        mode: targetCall.mode,
        senderId: user.id,
        text: "Call declined",
        event: "declined",
        createdAt: now,
      });
    } else if (body.action === "end") {
      targetCall.status = "ended";
      targetCall.updatedAt = now;
      targetCall.endedAt = now;
      targetCall.endedById = user.id;
      appendCallHistoryMessage({
        conversation,
        messages: db.messages,
        callId: targetCall.id,
        mode: targetCall.mode,
        senderId: user.id,
        text: "Call ended",
        event: "ended",
        durationMs: targetCall.answeredAt
          ? Math.max(0, new Date(now).getTime() - new Date(targetCall.answeredAt).getTime())
          : undefined,
        createdAt: now,
      });
    } else if (body.action === "signal") {
      if (
        typeof body.toUserId !== "string" ||
        !targetCall.participantIds.includes(body.toUserId) ||
        body.toUserId === user.id
      ) {
        return { type: "invalid_signal_target" as const };
      }

      if (
        body.signalType !== "offer" &&
        body.signalType !== "answer" &&
        body.signalType !== "ice"
      ) {
        return { type: "invalid_signal_type" as const };
      }

      targetCall.signals.push({
        id: createId("sig"),
        fromUserId: user.id,
        toUserId: body.toUserId,
        type: body.signalType,
        payload: body.payload,
        createdAt: now,
      });
      targetCall.updatedAt = now;

      if (body.signalType === "answer") {
        targetCall.status = "active";
        targetCall.answeredAt = targetCall.answeredAt ?? now;
      }
    } else if (body.action === "media") {
      targetCall.participants = targetCall.participants.map((participant) =>
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
      targetCall.updatedAt = now;
    }

    return {
      type: "ok" as const,
      session: mapCallSessionToDto({
        session: targetCall,
        usersById,
        currentUserId: user.id,
      }),
    };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (result.type === "busy") {
    return NextResponse.json(
      { error: "One of these users is already on another call." },
      { status: 409 },
    );
  }

  if (result.type === "missing_call") {
    return NextResponse.json({ error: "Call not found." }, { status: 404 });
  }

  if (result.type === "invalid_signal_target") {
    return NextResponse.json({ error: "Invalid signal target." }, { status: 400 });
  }

  if (result.type === "invalid_signal_type") {
    return NextResponse.json({ error: "Invalid signal type." }, { status: 400 });
  }

  return NextResponse.json({ session: result.session });
}
