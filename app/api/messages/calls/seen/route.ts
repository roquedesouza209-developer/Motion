import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

export async function POST(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateDb((db) => {
    const markedConversationIds = new Set<string>();
    const markedByConversation = new Map<string, number>();
    let markedCount = 0;

    for (const message of db.messages) {
      if (message.systemType !== "call" || message.callEvent !== "missed") {
        continue;
      }

      const readByIds = new Set(message.readByIds ?? []);

      if (readByIds.has(user.id)) {
        continue;
      }

      readByIds.add(user.id);
      message.readByIds = [...readByIds];

      const deliveredToIds = new Set(message.deliveredToIds ?? []);
      deliveredToIds.add(user.id);
      message.deliveredToIds = [...deliveredToIds];

      markedCount += 1;
      markedConversationIds.add(message.conversationId);
      markedByConversation.set(
        message.conversationId,
        (markedByConversation.get(message.conversationId) ?? 0) + 1,
      );
    }

    for (const conversation of db.conversations) {
      if (!markedConversationIds.has(conversation.id)) {
        continue;
      }

      const currentUnread = conversation.unreadCountByUserId[user.id] ?? 0;
      const markedForConversation = markedByConversation.get(conversation.id) ?? 0;
      conversation.unreadCountByUserId[user.id] = Math.max(
        0,
        currentUnread - markedForConversation,
      );
    }

    return {
      markedCount,
      conversationIds: [...markedConversationIds],
    };
  });

  return NextResponse.json(result);
}
