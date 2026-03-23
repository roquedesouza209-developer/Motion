import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

type TypingBody = {
  typing?: boolean;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TypingBody;

  try {
    body = (await request.json()) as TypingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
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

    conversation.typingByUserId = {
      ...(conversation.typingByUserId ?? {}),
    };

    if (body.typing) {
      conversation.typingByUserId[user.id] = new Date().toISOString();
    } else {
      delete conversation.typingByUserId[user.id];
    }

    const me = db.users.find((candidate) => candidate.id === user.id);
    if (me) {
      me.lastActiveAt = new Date().toISOString();
    }

    return { type: "ok" as const };
  });

  if (result.type === "missing") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (result.type === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
