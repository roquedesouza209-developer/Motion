import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import { deleteUploadedMedia } from "@/lib/server/media";
import type { RouteContext } from "@/lib/server/route-context";

export const runtime = "nodejs";

function isRecordingMessage(message: {
  attachment?: { name?: string; url?: string };
} | undefined) {
  return Boolean(message?.attachment?.name?.startsWith("motion-call-recording-"));
}

export async function DELETE(
  request: Request,
  context: RouteContext<{ conversationId: string }>,
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await context.params;

  const result = await updateDb((db) => {
    const conversation = db.conversations.find((candidate) => candidate.id === conversationId);

    if (!conversation) {
      return { type: "missing_conversation" as const };
    }

    if (!conversation.participantIds.includes(user.id)) {
      return { type: "forbidden" as const };
    }

    const recordingMessages = db.messages.filter(
      (candidate) =>
        candidate.conversationId === conversationId && isRecordingMessage(candidate),
    );

    if (recordingMessages.length === 0) {
      return { type: "no_recordings" as const };
    }

    const recordingIds = new Set(recordingMessages.map((message) => message.id));
    const mediaUrls = recordingMessages
      .map((message) => message.attachment?.url)
      .filter((value): value is string => typeof value === "string");

    db.messages = db.messages.filter((candidate) => !recordingIds.has(candidate.id));

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
      mediaUrls,
      deletedCount: recordingMessages.length,
    };
  });

  if (result.type === "missing_conversation") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (result.type === "no_recordings") {
    return NextResponse.json({ error: "No saved recordings in this thread." }, { status: 404 });
  }

  await Promise.allSettled(result.mediaUrls.map((mediaUrl) => deleteUploadedMedia(mediaUrl)));

  return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
}
