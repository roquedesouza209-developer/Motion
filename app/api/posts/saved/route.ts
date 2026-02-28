import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { mapPostToDto } from "@/lib/server/format";

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));

  const posts = db.posts
    .filter((post) => post.savedBy.includes(user.id))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((post) =>
      mapPostToDto({
        post,
        usersById,
        currentUserId: user.id,
      }),
    );

  return NextResponse.json({ posts });
}
