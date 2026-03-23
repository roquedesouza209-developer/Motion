import { NextResponse } from "next/server";

import { clearSessionCookie, getSessionIdFromRequest, revokeSession } from "@/lib/server/auth";

export async function POST(request: Request) {
  const sessionId = getSessionIdFromRequest(request);

  if (sessionId) {
    await revokeSession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
