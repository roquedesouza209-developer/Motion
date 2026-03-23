import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { readDb, updateDb } from "@/lib/server/database";
import { formatRelativeTime } from "@/lib/server/format";

type ViewBody = {
  viewedId?: string;
};

const VIEW_COOLDOWN_MS = 1000 * 60 * 60 * 6;

export async function GET(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDb();
  const views = db.profileViews
    .filter((view) => view.viewedId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)
    .map((view) => {
      const viewer = db.users.find((user) => user.id === view.viewerId);
      return {
        id: view.id,
        viewerId: view.viewerId,
        viewerName: viewer?.name ?? "Someone",
        viewerHandle: viewer?.handle ?? "motion.user",
        viewerAvatarGradient:
          viewer?.avatarGradient ?? "linear-gradient(135deg, #94a3b8, #64748b)",
        viewerAvatarUrl: viewer?.avatarUrl ?? null,
        createdAt: view.createdAt,
        time: formatRelativeTime(view.createdAt),
      };
    });

  return NextResponse.json({ views });
}

export async function POST(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ViewBody;

  try {
    body = (await request.json()) as ViewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const viewedId = body.viewedId?.trim() ?? "";

  if (!viewedId) {
    return NextResponse.json({ error: "Viewed user is required." }, { status: 400 });
  }

  if (viewedId === currentUser.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const result = await updateDb((db) => {
    const target = db.users.find((user) => user.id === viewedId);

    if (!target) {
      return { error: "not_found" } as const;
    }

    const now = Date.now();
    const recent = db.profileViews.find(
      (view) =>
        view.viewerId === currentUser.id &&
        view.viewedId === viewedId &&
        now - new Date(view.createdAt).getTime() < VIEW_COOLDOWN_MS,
    );

    if (recent) {
      return { skipped: true } as const;
    }

    db.profileViews.push({
      id: createId("view"),
      viewerId: currentUser.id,
      viewedId,
      createdAt: new Date().toISOString(),
    });

    return { ok: true } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, skipped: "skipped" in result });
}
