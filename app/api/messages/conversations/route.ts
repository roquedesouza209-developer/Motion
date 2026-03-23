import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import {
  formatRelativeTime,
  isTypingActive,
  resolvePresence,
  summarizeConversationMessage,
} from "@/lib/server/format";
import type { ConversationDto } from "@/lib/server/types";

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateDb((db) => {
    const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
    const messagesByConversation = new Map<string, typeof db.messages>();

    for (const message of db.messages) {
      const current = messagesByConversation.get(message.conversationId) ?? [];
      current.push(message);
      messagesByConversation.set(message.conversationId, current);
    }

    const conversations: ConversationDto[] = db.conversations
      .filter((conversation) => conversation.participantIds.includes(user.id))
      .map((conversation) => {
        const otherUserId =
          conversation.participantIds.find((id) => id !== user.id) ?? user.id;
        const otherUser = usersById.get(otherUserId);
        const history = (messagesByConversation.get(conversation.id) ?? [])
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const callHistory = history.filter((message) => message.systemType === "call");
        const lastCall = callHistory.at(-1);
        const directionalCalls = callHistory.filter(
          (message) =>
            message.callEvent === "started" || message.callEvent === "missed",
        );
        const missedCallCount = callHistory.filter(
          (message) =>
            message.callEvent === "missed" && !(message.readByIds ?? []).includes(user.id),
        ).length;

        history.forEach((message) => {
          if (message.senderId === user.id) {
            return;
          }

          const deliveredToIds = new Set(message.deliveredToIds ?? []);
          deliveredToIds.add(user.id);
          message.deliveredToIds = [...deliveredToIds];
        });

        const lastMessage = history.at(-1);
        const typing = isTypingActive(conversation.typingByUserId?.[otherUserId]);

        return {
          id: conversation.id,
          userId: otherUserId,
          name: otherUser?.name ?? "Conversation",
          status: resolvePresence(otherUser),
          unread: conversation.unreadCountByUserId[user.id] ?? 0,
          time: formatRelativeTime(lastMessage?.createdAt ?? conversation.updatedAt),
          lastMessage: summarizeConversationMessage({
            message: lastMessage,
            currentUserId: user.id,
            otherTyping: typing,
          }),
          typing,
          missedCallCount,
          hasVoiceCallHistory: callHistory.some((message) => message.callMode === "voice"),
          hasVideoCallHistory: callHistory.some((message) => message.callMode === "video"),
          hasIncomingCallHistory: directionalCalls.some(
            (message) => message.senderId !== user.id,
          ),
          hasOutgoingCallHistory: directionalCalls.some(
            (message) => message.senderId === user.id,
          ),
          lastCallMode: lastCall?.callMode,
          lastCallEvent: lastCall?.callEvent,
        };
      })
      .sort((a, b) => {
        const aConversation = db.conversations.find((candidate) => candidate.id === a.id);
        const bConversation = db.conversations.find((candidate) => candidate.id === b.id);
        return (
          new Date(bConversation?.updatedAt ?? 0).getTime() -
          new Date(aConversation?.updatedAt ?? 0).getTime()
        );
      });

    return { conversations };
  });

  return NextResponse.json(result);
}
