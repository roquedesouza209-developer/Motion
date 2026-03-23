import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";

type SupportPayload = {
  email?: string;
  message?: string;
};

type SupportRecord = {
  id: string;
  email: string;
  message: string;
  userId: string | null;
  createdAt: string;
};

const SUPPORT_PATH = path.join(process.cwd(), "data", "support-messages.json");
let writeQueue: Promise<void> = Promise.resolve();

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

async function readSupportMessages(): Promise<SupportRecord[]> {
  try {
    const raw = await fs.readFile(SUPPORT_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as SupportRecord[];
  } catch {
    return [];
  }
}

async function writeSupportMessages(records: SupportRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(SUPPORT_PATH), { recursive: true });
  const tempPath = `${SUPPORT_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(tempPath, SUPPORT_PATH);
}

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  let payload: SupportPayload;

  try {
    payload = (await request.json()) as SupportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = payload.email?.trim() || authUser?.email || "";
  const message = payload.message?.trim() ?? "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (message.length < 5) {
    return NextResponse.json(
      { error: "Message must be at least 5 characters." },
      { status: 400 },
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be at most 2000 characters." },
      { status: 400 },
    );
  }

  const record: SupportRecord = {
    id: createId("sup"),
    email,
    message,
    userId: authUser?.id ?? null,
    createdAt: new Date().toISOString(),
  };

  await enqueueWrite(async () => {
    const existing = await readSupportMessages();
    existing.push(record);
    await writeSupportMessages(existing);
  });

  return NextResponse.json({ ok: true });
}
