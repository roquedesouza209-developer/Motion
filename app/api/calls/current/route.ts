import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { mapCallSessionToDto } from "@/lib/server/format";

const ACTIVE_CALL_STATUSES = new Set(["ringing", "connecting", "active"]);

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const usersById = new Map(db.users.map((candidate) => [candidate.id, candidate]));
  const session =
    [...db.callSessions]
      .filter(
        (candidate) =>
          candidate.participantIds.includes(user.id) &&
          ACTIVE_CALL_STATUSES.has(candidate.status) &&
          !candidate.endedAt,
      )
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0] ?? null;

  return NextResponse.json({
    session: session ? mapCallSessionToDto({ session, usersById, currentUserId: user.id }) : null,
  });
}
