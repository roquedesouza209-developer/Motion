"use client";

import CaptionWithHashtags from "@/components/caption-with-hashtags";
import LivePostAge from "@/components/live-post-age";
import { normalizeHashtag } from "@/lib/hashtags";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MediaType = "image" | "video";

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
  coAuthors?: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  }[];
  collabInvites?: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  }[];
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

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  const rawTag = typeof params?.tag === "string" ? decodeURIComponent(params.tag) : "";
  const hashtag = normalizeHashtag(rawTag);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!hashtag) {
        setError("This hashtag is not valid.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (meRes.ok) {
          const mePayload = (await meRes.json()) as { user?: User };
          setUser(mePayload.user ?? null);
        } else {
          setUser(null);
        }

        const payload = await apiGet<{ posts: Post[] }>(
          `/api/posts?hashtag=${encodeURIComponent(hashtag)}`,
        );
        setPosts(payload.posts);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load hashtag posts.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [hashtag]);

  const openProfile = (handle: string) => {
    const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;
    router.push(`/profile?user=${cleanHandle}`);
  };

  const toggleSave = async (postId: string) => {
    if (!user) {
      router.push("/");
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        saved?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to vault post.");
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, saved: Boolean(payload.saved) } : post,
        ),
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to vault post.");
    }
  };

  if (loading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-6xl p-6">Loading hashtag...</div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to Feed
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Explore
            </Link>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Hashtag</p>
        </div>

        <section className="motion-surface p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Discover posts and reels
              </p>
              <h1
                className="mt-2 text-3xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                #{hashtag}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Newest matching posts and reels that are currently visible on Motion.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center">
              <p className="text-lg font-semibold text-slate-900">{posts.length}</p>
              <p className="text-xs text-slate-500">Matches</p>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {posts.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                    {post.mediaUrl && post.mediaType === "image" ? (
                      <Image
                        src={post.mediaUrl}
                        alt={`${post.author} post`}
                        fill
                        className="object-cover"
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

                    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/55" />
                    <div className="absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {post.kind}
                    </div>
                    <div className="absolute right-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                      <LivePostAge createdAt={post.createdAt} initialLabel={post.timeAgo} />
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => openProfile(post.handle)}
                          className="truncate text-left text-sm font-semibold text-slate-900 hover:text-[var(--brand)]"
                        >
                          {post.author}
                        </button>
                        <button
                          type="button"
                          onClick={() => openProfile(post.handle)}
                          className="block text-left text-xs text-slate-500 hover:text-[var(--brand)]"
                        >
                          {post.location ? `${post.handle} - ${post.location}` : post.handle}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleSave(post.id)}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${
                          post.saved
                            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                            : "border-[var(--line)] bg-white text-slate-600"
                        }`}
                        aria-label={post.saved ? "Remove from vault" : "Vault post"}
                        title={post.saved ? "Vaulted" : "Vault"}
                      >
                        <SaveGlyph saved={post.saved} />
                      </button>
                    </div>

                    <p className="text-sm leading-6 text-slate-700">
                      <CaptionWithHashtags caption={post.caption} />
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{post.likes} likes</span>
                      <span>{post.comments} comments</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white px-4 py-10 text-center text-sm text-slate-500">
              No live posts are using #{hashtag} yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
