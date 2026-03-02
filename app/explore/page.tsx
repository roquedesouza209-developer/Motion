"use client";

import LivePostAge from "@/components/live-post-age";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MediaType = "image" | "video";
type ExploreFilter = "all" | "photos" | "reels";
type ViewportMode = "desktop" | "tablet" | "mobile";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarGradient: string;
};

type Post = {
  id: string;
  author: string;
  handle: string;
  kind: "Photo" | "Reel";
  caption: string;
  location: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: number;
  gradient: string;
  createdAt: string;
  timeAgo: string;
  mediaUrl?: string;
  mediaType?: MediaType;
};

const DISCOVERY_TAGS = [
  "Street Portraits",
  "Travel Cuts",
  "Color Grading",
  "Studio Lighting",
  "Behind The Scenes",
  "Motion Cuts",
];
const PHOTO_ROW_SPANS = [26, 30, 34];
const REEL_ROW_SPANS = [34, 40, 46];

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload;
}

function sortByNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function ViewportPicker({
  mode,
  onChange,
}: {
  mode: ViewportMode;
  onChange: (next: ViewportMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = mode === "desktop" ? "Desktop" : mode === "tablet" ? "Tablet" : "Mobile";

  return (
    <div className="viewport-picker">
      <button
        type="button"
        className="theme-trigger-button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Switch viewport size"
        aria-expanded={open}
        title={`Viewport: ${label}`}
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.6" y="4" width="14.8" height="9.4" rx="1.6" />
          <path d="M7.5 16h5" />
          <path d="M9 13.4v2.6" />
        </svg>
      </button>
      {open ? (
        <div className="theme-menu motion-surface p-2">
          <div className="space-y-1">
            {[
              { id: "desktop" as const, label: "Desktop" },
              { id: "tablet" as const, label: "Tablet" },
              { id: "mobile" as const, label: "Mobile" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold ${
                  mode === option.id
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-[var(--line)] bg-white text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SaveGlyph({ saved }: { saved: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill={saved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.1 3.2h9.8a1.4 1.4 0 0 1 1.4 1.4v12l-6.3-3.4-6.3 3.4v-12a1.4 1.4 0 0 1 1.4-1.4Z" />
    </svg>
  );
}

function ExploreTile({
  post,
  featured,
  rowSpan,
  colSpan,
  onToggleSave,
}: {
  post: Post;
  featured: boolean;
  rowSpan: number;
  colSpan: number;
  onToggleSave: (postId: string) => void;
}) {
  return (
    <article
      className={`explore-mosaic-item group overflow-hidden rounded-2xl border border-[var(--line)] bg-white ${
        featured ? "is-featured" : ""
      }`}
      style={{
        gridRow: `span ${rowSpan} / span ${rowSpan}`,
        gridColumn: `span ${colSpan} / span ${colSpan}`,
      }}
    >
      <div className="relative h-full overflow-hidden">
        {post.mediaUrl && post.mediaType === "image" ? (
          <Image
            src={post.mediaUrl}
            alt={`${post.author} moment`}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : post.mediaUrl && post.mediaType === "video" ? (
          <video
            src={post.mediaUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="h-full w-full" style={{ background: post.gradient }} />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/70" />
        <div className="absolute left-3 top-3 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          {post.kind === "Reel" ? "Cut" : "Moment"}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <LivePostAge createdAt={post.createdAt} initialLabel={post.timeAgo} />
        </div>
        {featured ? (
          <div className="absolute left-3 top-10 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-900 backdrop-blur-sm">
            Featured
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
          <div className="min-w-0 text-white">
            <p className="truncate text-sm font-semibold">{post.author}</p>
            <p className="line-clamp-2 text-xs text-white/80">
              {post.caption || post.handle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleSave(post.id)}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-sm ${
              post.saved
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : "border-white/20 bg-black/35 text-white"
            }`}
            aria-label={post.saved ? "Remove from vault" : "Vault moment"}
            title={post.saved ? "Vaulted" : "Vault"}
          >
            <SaveGlyph saved={post.saved} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<ExploreFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");

  useEffect(() => {
    const storedViewport = window.localStorage.getItem("motion-viewport");
    if (storedViewport === "desktop" || storedViewport === "tablet" || storedViewport === "mobile") {
      setViewportMode(storedViewport);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("motion-viewport", viewportMode);
  }, [viewportMode]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });

        if (meRes.status === 401) {
          router.replace("/");
          return;
        }

        const mePayload = (await meRes.json()) as { user: User };
        setUser(mePayload.user);

        const discover = await apiGet<{ posts: Post[] }>("/api/posts?scope=discover");
        setPosts(discover.posts);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load radar.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  const visiblePosts = useMemo(() => {
    if (filter === "photos") {
      return sortByNewest(posts.filter((post) => post.kind === "Photo"));
    }

    if (filter === "reels") {
      return sortByNewest(posts.filter((post) => post.kind === "Reel"));
    }

    return sortByNewest(posts);
  }, [filter, posts]);

  const postTiles = useMemo(
    () =>
      visiblePosts.map((post, index) => {
        const spanSet = post.kind === "Reel" ? REEL_ROW_SPANS : PHOTO_ROW_SPANS;
        const seed =
          post.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + index;
        const featured = index % 7 === 0;

        return {
          post,
          featured,
          rowSpan: featured ? spanSet[seed % spanSet.length] + 10 : spanSet[seed % spanSet.length],
          colSpan: featured ? 2 : 1,
        };
      }),
    [visiblePosts],
  );

  const toggleSave = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        saved?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to vault moment.");
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, saved: Boolean(payload.saved) } : post,
        ),
      );
    } catch (toggleError) {
        setError(
          toggleError instanceof Error ? toggleError.message : "Failed to vault moment.",
        );
    }
  };

  if (loading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-6xl p-6">Loading radar...</div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-6" data-viewport={viewportMode}>
      <div className="motion-viewport">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Flow
          </Link>
          <div className="flex items-center gap-3">
            <ViewportPicker mode={viewportMode} onChange={setViewportMode} />
            {user ? (
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-xs font-bold text-white"
                style={{ background: user.avatarGradient }}
                aria-label="Open profile"
                title="Profile"
              >
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </button>
            ) : null}
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Radar</p>
          </div>
        </div>

        <section className="motion-surface p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Radar
              </p>
              <h1
                className="mt-2 text-3xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Fresh radar, separate from flow.
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Radar trending moments and cuts without loading down the main flow.
              </p>
            </div>

            <div className="inline-flex rounded-full border border-[var(--line)] bg-white p-1">
              {[
                { id: "all" as const, label: "All" },
                { id: "photos" as const, label: "Moments" },
                { id: "reels" as const, label: "Cuts" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    filter === option.id ? "bg-[var(--brand)] text-white" : "text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {DISCOVERY_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {postTiles.length > 0 ? (
            <div className="explore-mosaic mt-5">
              {postTiles.map(({ post, featured, rowSpan, colSpan }) => (
                <ExploreTile
                  key={post.id}
                  post={post}
                  featured={featured}
                  rowSpan={rowSpan}
                  colSpan={colSpan}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-slate-500">
              Nothing in radar yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
