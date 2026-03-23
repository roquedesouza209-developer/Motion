import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";

export async function GET(request: Request) {
    const currentUser = await getAuthUser(request);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase();

    const db = await readDb();

    let result = db.users.filter((u) => u.id !== currentUser?.id);

    if (q) {
        result = result.filter(
            (u) =>
                u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q),
        );
    }

    const data = result.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.handle,
        accountType: u.accountType,
        avatarUrl: u.avatarUrl,
        avatarGradient: u.avatarGradient,
    }));

    return NextResponse.json({ users: data });
}
