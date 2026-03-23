"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MediaType = "image" | "video";
type CollabPost = {
  id: string;
  author: string;
  handle: string;
  caption: string;
  kind: "Photo" | "Reel";
  createdAt: string;
  timeAgo: string;
  mediaUrl?: string;
  mediaType?: MediaType;
};

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
}

export default function CollabRequestsPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<CollabPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiGet<{ posts: CollabPost[] }>("/api/posts/collab-invites");
        setInvites(payload.posts);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load collab requests.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const respond = async (postId: string, action: "accept" | "decline") => {
    setActionId(`${postId}-${action}`);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/collab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update invite.");
      }
      setInvites((current) => current.filter((post) => post.id !== postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update invite.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="motion-shell min-h-screen">
      <main className="motion-viewport motion-main pb-16 pt-10">
        <section className="motion-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Collaborations</p>
              <h1
                className="text-2xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Collab Requests
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review posts you’ve been invited to co-author.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to Feed
            </button>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white px-4 py-6 text-sm text-slate-500">
              Loading collab requests...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : invites.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white px-4 py-6 text-sm text-slate-500">
              No collab invites right now.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {invites.map((post) => (
                <article key={post.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {post.author}{" "}
                        <span className="text-xs text-slate-500">{post.handle}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{post.timeAgo}</p>
                      <p className="mt-2 text-sm text-slate-700">{post.caption}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                      Invite pending
                    </span>
                  </div>
                  {post.mediaUrl ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
                      {post.mediaType === "image" ? (
                        <Image
                          src={post.mediaUrl}
                          alt="Collab media"
                          width={800}
                          height={500}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <video
                          src={post.mediaUrl}
                          className="h-48 w-full object-cover"
                          controls
                          muted
                          preload="metadata"
                        />
                      )}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void respond(post.id, "accept")}
                      disabled={actionId === `${post.id}-accept`}
                      className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {actionId === `${post.id}-accept` ? "Accepting..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void respond(post.id, "decline")}
                      disabled={actionId === `${post.id}-decline`}
                      className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-60"
                    >
                      {actionId === `${post.id}-decline` ? "Declining..." : "Decline"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
