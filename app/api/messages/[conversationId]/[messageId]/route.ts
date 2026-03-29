import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import { deleteUploadedMedia } from "@/lib/server/media";
import { mapMessageToDto } from "@/lib/server/format";

type RouteContext = {
  params: Promise<{
    conversationId: string;
    messageId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string };

  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (body.action !== "unsend") {
    return NextResponse.json({ error: "Unsupported message action." }, { status: 400 });
  }

  const { conversationId, messageId } = await context.params;

  const result = await updateDb((db) => {
    const conversation = db.conversations.find(
      (candidate) => candidate.id === conversationId,
    );

    if (!conversation) {
      return { type: "conversation_missing" as const };
    }

    if (!conversation.participantIds.includes(user.id)) {
      return { type: "forbidden" as const };
    }

    const message = db.messages.find(
      (candidate) =>
        candidate.id === messageId && candidate.conversationId === conversation.id,
    );

    if (!message) {
      return { type: "message_missing" as const };
    }

    if (message.systemType === "call") {
      return { type: "not_supported" as const };
    }

    if (message.senderId !== user.id) {
      return { type: "forbidden" as const };
    }

    const attachmentUrl = message.attachment?.url;

    message.text = "";
    message.attachment = undefined;
    message.reactions = [];
    message.unsentAt = new Date().toISOString();
    message.unsentById = user.id;

    const otherUserIds = conversation.participantIds.filter((id) => id !== user.id);
    const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
    const messagesById = new Map(
      db.messages
        .filter((candidate) => candidate.conversationId === conversation.id)
        .map((candidate) => [candidate.id, candidate]),
    );

    return {
      type: "ok" as const,
      attachmentUrl,
      message: mapMessageToDto({
        message,
        currentUserId: user.id,
        recipientIds: otherUserIds,
        usersById,
        messagesById,
      }),
    };
  });

  if (result.type === "conversation_missing") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "message_missing") {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  if (result.type === "not_supported") {
    return NextResponse.json({ error: "This message cannot be unsent." }, { status: 400 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (result.attachmentUrl?.startsWith("/uploads/")) {
    await deleteUploadedMedia(result.attachmentUrl).catch(() => undefined);
  }

  return NextResponse.json({ message: result.message });
}
