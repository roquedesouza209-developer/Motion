import { NextResponse } from "next/server";

import { attachSessionCookie, authenticateUser, createSession, toPublicUser } from "@/lib/server/auth";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = await authenticateUser({ email, password });

  if (!user) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  const sessionId = await createSession(user.id);
  const response = NextResponse.json({ user: toPublicUser(user) });
  attachSessionCookie(response, sessionId);

  return response;
}
