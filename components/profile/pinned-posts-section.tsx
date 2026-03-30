"use client";

import Image from "next/image";

import type { ProfileGridPost } from "@/components/profile/profile-media-grid";

type PinnedPostsSectionProps = {
  posts: ProfileGridPost[];
  isViewingSelf: boolean;
  onTogglePin?: (postId: string) => void;
};

export default function PinnedPostsSection({
  posts,
  isViewingSelf,
  onTogglePin,
}: PinnedPostsSectionProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-5 rounded-[1.7rem] border border-[var(--line)] bg-white/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Pinned Posts
          </p>
          <h2
            className="mt-1 text-lg font-semibold text-slate-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Featured at the top of the profile
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {posts.length} {posts.length === 1 ? "featured post" : "featured posts"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--plain-bg)] shadow-[0_24px_48px_-36px_rgba(15,23,42,0.58)]"
          >
            <div className="relative aspect-[1.2/1] overflow-hidden">
              {post.mediaUrl && post.mediaType === "image" ? (
                <Image
                  src={post.mediaUrl}
                  alt={`${post.author} pinned post`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  Pinned
                </span>
                <span className="rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {post.kind}
                </span>
              </div>
              {isViewingSelf && onTogglePin ? (
                <button
                  type="button"
                  onClick={() => onTogglePin(post.id)}
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
                  title="Unpin post"
                  aria-label="Unpin post"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 3h6l-1 5 4 4v2H6v-2l4-4-1-5Z" />
                    <path d="M12 14v7" />
                  </svg>
                </button>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-sm font-semibold">{post.author}</p>
                <p className="mt-1 line-clamp-2 text-sm text-white/85">
                  {post.caption || post.location || `${post.kind} by ${post.author}`}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
