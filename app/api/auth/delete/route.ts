import { NextResponse } from "next/server";

import { clearSessionCookie, getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

export async function POST(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = currentUser.id;

  await updateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.userId !== userId);

    const removedPostIds = new Set(
      db.posts.filter((post) => post.userId === userId).map((post) => post.id),
    );

    db.posts = db.posts
      .filter((post) => post.userId !== userId)
      .map((post) => ({
        ...post,
        likedBy: post.likedBy.filter((id) => id !== userId),
        savedBy: post.savedBy.filter((id) => id !== userId),
      }));

    db.comments = db.comments.filter(
      (comment) =>
        comment.userId !== userId && !removedPostIds.has(comment.postId),
    );

    const commentTotals = new Map<string, number>();
    db.comments.forEach((comment) => {
      commentTotals.set(
        comment.postId,
        (commentTotals.get(comment.postId) ?? 0) + 1,
      );
    });

    db.posts = db.posts.map((post) => ({
      ...post,
      commentCount: commentTotals.get(post.id) ?? 0,
    }));

    db.stories = db.stories
      .filter((story) => story.userId !== userId)
      .map((story) => ({
        ...story,
        seenBy: story.seenBy.filter((id) => id !== userId),
      }));

    db.follows = db.follows.filter(
      (follow) => follow.followerId !== userId && follow.followingId !== userId,
    );

    db.notifications = db.notifications.filter(
      (notification) =>
        notification.userId !== userId && notification.actorId !== userId,
    );

    db.profileViews = db.profileViews.filter(
      (view) => view.viewerId !== userId && view.viewedId !== userId,
    );

    db.creatorReportSchedules = db.creatorReportSchedules.filter(
      (schedule) => schedule.userId !== userId,
    );
    db.creatorReportDeliveries = db.creatorReportDeliveries.filter(
      (delivery) => delivery.userId !== userId,
    );

    const remainingConversations = db.conversations.filter(
      (conversation) => !conversation.participantIds.includes(userId),
    );
    const remainingConversationIds = new Set(
      remainingConversations.map((conversation) => conversation.id),
    );
    db.conversations = remainingConversations;
    db.messages = db.messages.filter((message) =>
      remainingConversationIds.has(message.conversationId),
    );

    db.users = db.users.filter((user) => user.id !== userId);
  });

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
