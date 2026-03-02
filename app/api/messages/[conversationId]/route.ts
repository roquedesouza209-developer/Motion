import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { updateDb } from "@/lib/server/database";
import { resolvePresence } from "@/lib/server/format";
import type { MessageDto } from "@/lib/server/types";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

type SendBody = {
  text?: string;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await context.params;

  const result = await updateDb((db) => {
    const conversation = db.conversations.find(
      (candidate) => candidate.id === conversationId,
    );

    if (!conversation) {
      return { type: "missing" as const };
    }

    if (!conversation.participantIds.includes(user.id)) {
      return { type: "forbidden" as const };
    }

    conversation.unreadCountByUserId[user.id] = 0;

    const otherUserId =
      conversation.participantIds.find((id) => id !== user.id) ?? user.id;
    const otherUser = db.users.find((candidate) => candidate.id === otherUserId);
    const messages = db.messages
      .filter((message) => message.conversationId === conversation.id)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .map<MessageDto>((message) => ({
        id: message.id,
        from: message.senderId === user.id ? "me" : "them",
        text: message.text,
        createdAt: message.createdAt,
      }));

    return {
      type: "ok" as const,
      conversation: {
        id: conversation.id,
        name: otherUser?.name ?? "Conversation",
        status: resolvePresence(otherUserId),
      },
      messages,
    };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendBody;

  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";

  if (text.length < 1 || text.length > 500) {
    return NextResponse.json(
      { error: "Message must be between 1 and 500 characters." },
      { status: 400 },
    );
  }

  const { conversationId } = await context.params;

  const result = await updateDb((db) => {
    const conversation = db.conversations.find(
      (candidate) => candidate.id === conversationId,
    );

    if (!conversation) {
      return { type: "missing" as const };
    }

    if (!conversation.participantIds.includes(user.id)) {
      return { type: "forbidden" as const };
    }

    const now = new Date().toISOString();
    const message = {
      id: createId("msg"),
      conversationId: conversation.id,
      senderId: user.id,
      text,
      createdAt: now,
    };

    db.messages.push(message);
    conversation.updatedAt = now;

    for (const participantId of conversation.participantIds) {
      if (participantId === user.id) {
        conversation.unreadCountByUserId[participantId] = 0;
      } else {
        conversation.unreadCountByUserId[participantId] =
          (conversation.unreadCountByUserId[participantId] ?? 0) + 1;
      }
    }

    return {
      type: "ok" as const,
      message: {
        id: message.id,
        from: "me" as const,
        text: message.text,
        createdAt: message.createdAt,
      },
    };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(result.message, { status: 201 });
}
