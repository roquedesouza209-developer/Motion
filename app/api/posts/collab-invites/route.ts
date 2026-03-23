import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { mapPostToDto } from "@/lib/server/format";

export async function GET(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((user) => [user.id, user]));

  const posts = db.posts
    .filter(
      (post) =>
        post.deletedAt == null &&
        post.archivedAt == null &&
        post.coAuthorInvites?.includes(currentUser.id),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => mapPostToDto({ post, usersById, currentUserId: currentUser.id }));

  return NextResponse.json({ posts });
}
