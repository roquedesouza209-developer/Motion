import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { formatRelativeTime, resolvePresence } from "@/lib/server/format";
import type { ConversationDto } from "@/lib/server/types";

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
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
      const history = (messagesByConversation.get(conversation.id) ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const lastMessage = history.at(-1);

      return {
        id: conversation.id,
        name: otherUser?.name ?? "Conversation",
        status: resolvePresence(otherUserId),
        unread: conversation.unreadCountByUserId[user.id] ?? 0,
        time: formatRelativeTime(lastMessage?.createdAt ?? conversation.updatedAt),
        lastMessage: lastMessage?.text ?? "No threads yet.",
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

  return NextResponse.json({ conversations });
}
