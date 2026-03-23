import { NextResponse } from "next/server";

import { MUSIC_LIBRARY } from "@/lib/server/music";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim().toLowerCase();

  const results = query
    ? MUSIC_LIBRARY.filter(
        (track) =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query),
      )
    : MUSIC_LIBRARY;

  return NextResponse.json({ tracks: results.slice(0, 12) });
}
