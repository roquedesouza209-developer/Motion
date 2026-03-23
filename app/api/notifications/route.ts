import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { formatRelativeTime } from "@/lib/server/format";

export async function GET(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((user) => [user.id, user]));
  const callsById = new Map(db.callSessions.map((call) => [call.id, call]));

  const postsById = new Map(db.posts.map((post) => [post.id, post]));
  const storiesById = new Map(db.stories.map((story) => [story.id, story]));

  const notifications = db.notifications
    .filter((notification) => notification.userId === currentUser.id)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 25)
    .map((notification) => {
      const actor = usersById.get(notification.actorId);
      const post = notification.postId ? postsById.get(notification.postId) : null;
      const story = notification.storyId
        ? storiesById.get(notification.storyId)
        : null;
      const call = notification.callId ? callsById.get(notification.callId) : null;
      return {
        id: notification.id,
        type: notification.type,
        createdAt: notification.createdAt,
        time: formatRelativeTime(notification.createdAt),
        callMode: notification.callMode ?? null,
        conversationId: notification.conversationId ?? call?.conversationId ?? null,
        emoji: notification.emoji ?? null,
        text: notification.text ?? null,
        actor: actor
          ? {
              id: actor.id,
              name: actor.name,
              handle: actor.handle,
              avatarGradient: actor.avatarGradient,
              avatarUrl: actor.avatarUrl,
            }
          : null,
        post: post
          ? {
              id: post.id,
              caption: post.caption,
              kind: post.kind,
            }
          : null,
        story: story
          ? {
              id: story.id,
              caption: story.caption,
            }
          : null,
      };
    })
    .filter((notification) => Boolean(notification.actor));

  return NextResponse.json({ notifications });
}
