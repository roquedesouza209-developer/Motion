import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import type { RouteContext } from "@/lib/server/route-context";

type CollabAction = "accept" | "decline" | "withdraw";

export async function POST(
  request: Request,
  context: RouteContext<{ postId: string }>,
) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: CollabAction };

  try {
    body = (await request.json()) as { action?: CollabAction };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "decline" && action !== "withdraw") {
    return NextResponse.json(
      { error: "Action must be accept, decline, or withdraw." },
      { status: 400 },
    );
  }

  const { postId } = await context.params;

  const result = await updateDb((db) => {
    const post = db.posts.find((entry) => entry.id === postId);
    if (!post) {
      return { error: "not_found" } as const;
    }

    const invites = new Set(post.coAuthorInvites ?? []);
    if (action === "withdraw") {
      if (post.userId !== currentUser.id) {
        return { error: "not_owner" } as const;
      }
    } else if (!invites.has(currentUser.id)) {
      return { error: "not_invited" } as const;
    }

    if (action === "withdraw") {
      post.coAuthorInvites = [];
    } else {
      invites.delete(currentUser.id);
      post.coAuthorInvites = [...invites];
    }

    if (action === "accept") {
      const coAuthors = new Set(post.coAuthorIds ?? []);
      coAuthors.add(currentUser.id);
      post.coAuthorIds = [...coAuthors];
      db.notifications.push({
        id: createId("not"),
        userId: post.userId,
        actorId: currentUser.id,
        type: "collab_accept",
        postId: post.id,
        createdAt: new Date().toISOString(),
      });
    }

    if (action === "withdraw") {
      db.notifications = db.notifications.filter(
        (notification) =>
          !(
            notification.type === "collab_invite" &&
            notification.postId === post.id
          ),
      );
    } else {
      db.notifications = db.notifications.filter(
        (notification) =>
          !(
            notification.type === "collab_invite" &&
            notification.postId === post.id &&
            notification.userId === currentUser.id
          ),
      );
    }

    return { postId: post.id, action } as const;
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json(
      {
        error:
          result.error === "not_invited"
            ? "You are not invited to this post."
            : result.error === "not_owner"
              ? "Only the original author can withdraw invites."
            : "Post not found.",
      },
      { status },
    );
  }

  return NextResponse.json(result);
}

export async function GET(
  request: Request,
  context: RouteContext<{ postId: string }>,
) {
  const currentUser = await getAuthUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;
  const db = await readDb();
  const post = db.posts.find((entry) => entry.id === postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({
    invited: post.coAuthorInvites?.includes(currentUser.id) ?? false,
    accepted: post.coAuthorIds?.includes(currentUser.id) ?? false,
  });
}
