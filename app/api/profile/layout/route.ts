import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb, updateDb } from "@/lib/server/database";

type LayoutBody = {
  order?: string[];
  pinned?: string[];
};

const normalizeList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const dedupe = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTarget = url.searchParams.get("user")?.trim() ?? "";
  const currentUser = await getAuthUser(request);

  if (!currentUser && !rawTarget) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const normalizedTarget = rawTarget.replace(/^@/, "").toLowerCase();
  const user = rawTarget
    ? db.users.find(
        (candidate) =>
          candidate.id === rawTarget ||
          candidate.handle.toLowerCase() === normalizedTarget,
      )
    : db.users.find((candidate) => candidate.id === currentUser?.id);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    order: user.postLayoutOrder ?? [],
    pinned: user.pinnedPostIds ?? [],
  });
}

export async function POST(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LayoutBody;

  try {
    body = (await request.json()) as LayoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const rawOrder = dedupe(normalizeList(body.order));
  const rawPinned = dedupe(normalizeList(body.pinned));

  const result = await updateDb((db) => {
    const user = db.users.find((candidate) => candidate.id === currentUser.id);

    if (!user) {
      return { error: "not_found" } as const;
    }

    const allowedIds = new Set(
      db.posts
        .filter(
          (post) =>
            !post.deletedAt &&
            (post.userId === currentUser.id ||
              post.coAuthorIds?.includes(currentUser.id)),
        )
        .map((post) => post.id),
    );

    const order = rawOrder.filter((id) => allowedIds.has(id));
    const pinned = rawPinned.filter((id) => allowedIds.has(id));
    const orderSet = new Set(order);

    pinned.forEach((id) => {
      if (!orderSet.has(id)) {
        order.push(id);
        orderSet.add(id);
      }
    });

    user.postLayoutOrder = order;
    user.pinnedPostIds = pinned;

    return { order, pinned } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
