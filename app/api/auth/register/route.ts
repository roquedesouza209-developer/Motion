import { NextResponse } from "next/server";

import { attachSessionCookie, toPublicUser, SESSION_MAX_AGE_SECONDS } from "@/lib/server/auth";
import { createId, createPasswordHash } from "@/lib/server/crypto";
import { updateDb } from "@/lib/server/database";
import { buildHandle } from "@/lib/server/format";
import type { UserRecord } from "@/lib/server/types";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #ff8f6b, #ff5f6d)",
  "linear-gradient(135deg, #00a3a3, #00b1ff)",
  "linear-gradient(135deg, #ffc048, #ff6b6b)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #ff9a9e, #fbc2eb)",
];

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(request: Request) {
  let body: RegisterBody;

  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const result = await updateDb((db) => {
    const emailExists = db.users.some(
      (candidate) => candidate.email.toLowerCase() === email,
    );

    if (emailExists) {
      return null;
    }

    const { hash, salt } = createPasswordHash(password);
    const existingHandles = db.users.map((user) => user.handle);
    const handle = buildHandle(name, existingHandles);
    const newUser: UserRecord = {
      id: createId("usr"),
      name,
      handle,
      role: "Creator",
      email,
      passwordHash: hash,
      passwordSalt: salt,
      avatarGradient: AVATAR_GRADIENTS[db.users.length % AVATAR_GRADIENTS.length],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    const sessionId = createId("ses");
    db.sessions.push({
      id: sessionId,
      userId: newUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    });

    return { user: newUser, sessionId };
  });

  if (!result) {
    return NextResponse.json(
      { error: "That email is already registered." },
      { status: 409 },
    );
  }

  const response = NextResponse.json({ user: toPublicUser(result.user) });
  attachSessionCookie(response, result.sessionId);
  return response;
}
