import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { deleteUploadedMedia } from "@/lib/server/media";
import type { RouteContext } from "@/lib/server/route-context";
import { updateDb } from "@/lib/server/database";

export const runtime = "nodejs";

function isRecordingMessage(message: {
  attachment?: { name?: string; url?: string };
} | undefined) {
  return Boolean(message?.attachment?.name?.startsWith("motion-call-recording-"));
}

export async function DELETE(
  request: Request,
  context: RouteContext<{ conversationId: string; messageId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, messageId } = await context.params;

  const result = await updateDb((db) => {
    const conversation = db.conversations.find((candidate) => candidate.id === conversationId);

    if (!conversation) {
      return { type: "missing_conversation" as const };
    }

    if (!conversation.participantIds.includes(user.id)) {
      return { type: "forbidden" as const };
    }

    const messageIndex = db.messages.findIndex(
      (candidate) => candidate.id === messageId && candidate.conversationId === conversationId,
    );

    if (messageIndex < 0) {
      return { type: "missing_message" as const };
    }

    const message = db.messages[messageIndex];

    if (!isRecordingMessage(message) || !message.attachment?.url) {
      return { type: "not_recording" as const };
    }

    db.messages.splice(messageIndex, 1);

    for (const participantId of conversation.participantIds) {
      const unreadCount = db.messages.filter(
        (candidate) =>
          candidate.conversationId === conversationId &&
          candidate.senderId !== participantId &&
          !(candidate.readByIds ?? []).includes(participantId),
      ).length;
      conversation.unreadCountByUserId[participantId] = unreadCount;
    }

    const latestRemainingMessage = db.messages
      .filter((candidate) => candidate.conversationId === conversationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    conversation.updatedAt = latestRemainingMessage?.createdAt ?? conversation.updatedAt;

    return {
      type: "ok" as const,
      mediaUrl: message.attachment.url,
    };
  });

  if (result.type === "missing_conversation") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (result.type === "missing_message") {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  if (result.type === "not_recording") {
    return NextResponse.json({ error: "This message is not a saved call recording." }, { status: 400 });
  }

  await deleteUploadedMedia(result.mediaUrl);

  return NextResponse.json({ ok: true });
}
