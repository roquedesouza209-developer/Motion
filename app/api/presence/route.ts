import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";
import { isUserActive } from "@/lib/server/format";

export async function POST(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  const result = await updateDb((db) => {
    const me = db.users.find((user) => user.id === currentUser.id);
    if (me) {
      me.lastActiveAt = now;
    }

    const followingIds = db.follows
      .filter((follow) => follow.followerId === currentUser.id)
      .map((follow) => follow.followingId);
    const activity = db.users
      .filter((user) => followingIds.includes(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        avatarGradient: user.avatarGradient,
        lastActiveAt: user.lastActiveAt ?? null,
        isActive: isUserActive(user),
      }));

    return { activity };
  });

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
