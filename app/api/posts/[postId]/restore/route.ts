import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type RouteContext = {
    params: Promise<{
        postId: string;
    }>;
};

export async function POST(request: Request, context: RouteContext) {
    const user = await getAuthUser(request);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await context.params;

    const result = await updateDb((db) => {
        const postIndex = db.posts.findIndex((candidate) => candidate.id === postId);

        if (postIndex < 0) {
            return { type: "missing" as const };
        }

        const post = db.posts[postIndex];

        if (post.userId !== user.id) {
            return { type: "forbidden" as const };
        }

        delete post.deletedAt;

        return { type: "restored" as const };
    });

    if (result.type === "missing") {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    if (result.type === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
}
