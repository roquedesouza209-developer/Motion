import { NextResponse } from "next/server";

import { getAuthUser, toPublicUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
