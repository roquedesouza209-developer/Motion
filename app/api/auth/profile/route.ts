import { NextResponse } from "next/server";

import { getAuthUser, toPublicUser } from "@/lib/server/auth";
import { updateDb } from "@/lib/server/database";

type UpdateProfileBody = {
    name?: string;
    handle?: string;
    bio?: string;
    avatarUrl?: string;
    feedVisibility?: string;
    hiddenFromIds?: string[];
};

export async function PATCH(request: Request) {
    const user = await getAuthUser(request);

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: UpdateProfileBody;

    try {
        body = (await request.json()) as UpdateProfileBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const name = body.name?.trim();
    const handle = body.handle?.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    const bio = body.bio !== undefined ? body.bio.trim() : undefined;
    const avatarUrl = body.avatarUrl !== undefined ? body.avatarUrl.trim() : undefined;
    const feedVisibility = body.feedVisibility;
    const hiddenFromIds = body.hiddenFromIds;

    if (name !== undefined && name.length < 2) {
        return NextResponse.json(
            { error: "Name must be at least 2 characters." },
            { status: 400 },
        );
    }

    if (handle !== undefined && handle.length < 2) {
        return NextResponse.json(
            { error: "Username must be at least 2 characters." },
            { status: 400 },
        );
    }

    if (bio !== undefined && bio.length > 160) {
        return NextResponse.json(
            { error: "Bio must be 160 characters or fewer." },
            { status: 400 },
        );
    }

    if (avatarUrl !== undefined && avatarUrl !== "" && !avatarUrl.startsWith("/uploads/")) {
        return NextResponse.json(
            { error: "Avatar must point to /uploads." },
            { status: 400 },
        );
    }

    const result = await updateDb((db) => {
        const userRecord = db.users.find((u) => u.id === user.id);

        if (!userRecord) {
            return { type: "missing" as const };
        }

        if (handle !== undefined && handle !== userRecord.handle) {
            const taken = db.users.some(
                (u) => u.id !== user.id && u.handle.toLowerCase() === handle,
            );

            if (taken) {
                return { type: "handle_taken" as const };
            }

            userRecord.handle = handle;
        }

        if (name !== undefined) {
            userRecord.name = name;
        }

        if (bio !== undefined) {
            userRecord.bio = bio;
        }

        if (avatarUrl !== undefined) {
            userRecord.avatarUrl = avatarUrl || undefined;
        }

        if (feedVisibility !== undefined && ["everyone", "followers", "non_followers", "custom"].includes(feedVisibility)) {
            userRecord.feedVisibility = feedVisibility as "everyone" | "followers" | "non_followers" | "custom";
        }

        if (Array.isArray(hiddenFromIds)) {
            userRecord.hiddenFromIds = hiddenFromIds.filter((id) => typeof id === "string");
        }

        return { type: "updated" as const, user: toPublicUser(userRecord) };
    });

    if (result.type === "missing") {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (result.type === "handle_taken") {
        return NextResponse.json(
            { error: "Username is already taken." },
            { status: 409 },
        );
    }

    return NextResponse.json({ user: result.user });
}
