"use client";

import CaptionWithHashtags from "@/components/caption-with-hashtags";
import LivePostAge from "@/components/live-post-age";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type MediaType = "image" | "video";
type ViewportMode = "desktop" | "tablet" | "mobile";

type ReelPost = {
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
  shareCount: number;
  gradient: string;
  createdAt: string;
  timeAgo: string;
  mediaUrl?: string;
  mediaType?: MediaType;
};

type ReelResponse = {
  posts: ReelPost[];
};

type CommentEntry = {
  id: string;
  author: string;
  handle: string;
  avatarGradient: string;
  text: string;
  createdAt: string;
  time: string;
};

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

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (init?.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

async function loadScope(scope: "following" | "discover"): Promise<ReelPost[]> {
  const response = await fetch(`/api/posts?scope=${scope}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as ReelResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load reels.");
  }

  return payload.posts ?? [];
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

function ReelCard({
  reel,
  onSaveToggle,
  onLikeToggle,
  onCommentOpen,
  onWatch,
  shareOpen,
  onShareToggle,
  onShareToAccounts,
  onCopyLink,
  shareNotice,
}: {
  reel: ReelPost;
  onSaveToggle: (postId: string) => void;
  onLikeToggle: (postId: string) => void;
  onCommentOpen: (postId: string) => void;
  onWatch: (postId: string, ms: number) => void;
  shareOpen: boolean;
  onShareToggle: (postId: string) => void;
  onShareToAccounts: (post: ReelPost) => void;
  onCopyLink: (postId: string) => void;
  shareNotice: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const watchStartRef = useRef<number | null>(null);
  const watchAccumulatedRef = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;

    if (!video || !container) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        if (entry.isIntersecting && !paused) {
          void video.play().catch(() => undefined);
          return;
        }

        const stop = () => {
          if (watchStartRef.current !== null) {
            watchAccumulatedRef.current += Date.now() - watchStartRef.current;
            watchStartRef.current = null;
          }
          if (watchAccumulatedRef.current >= 1000) {
            onWatch(reel.id, watchAccumulatedRef.current);
            watchAccumulatedRef.current = 0;
          }
        };

        video.pause();
        stop();
      },
      { threshold: 0.65 },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [onWatch, paused, reel.id]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (paused) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [paused]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const start = () => {
      if (watchStartRef.current == null) {
        watchStartRef.current = Date.now();
      }
    };

    const stop = () => {
      if (watchStartRef.current !== null) {
        watchAccumulatedRef.current += Date.now() - watchStartRef.current;
        watchStartRef.current = null;
      }
      if (watchAccumulatedRef.current >= 1000) {
        onWatch(reel.id, watchAccumulatedRef.current);
        watchAccumulatedRef.current = 0;
      }
    };

    video.addEventListener("play", start);
    video.addEventListener("pause", stop);
    video.addEventListener("ended", stop);

    return () => {
      stop();
      video.removeEventListener("play", start);
      video.removeEventListener("pause", stop);
      video.removeEventListener("ended", stop);
    };
  }, [onWatch, reel.id]);

  const togglePlayback = () => {
    if (!videoRef.current) {
      return;
    }

    setPaused((current) => !current);
  };

  return (
    <section
      ref={containerRef}
      className="relative h-screen snap-start overflow-hidden bg-black text-white"
    >
      <button
        type="button"
        onClick={togglePlayback}
        className="relative block h-full w-full text-left"
        aria-label={paused ? "Play reel" : "Pause reel"}
      >
        {reel.mediaUrl && reel.mediaType === "video" ? (
          <video
            ref={videoRef}
            src={reel.mediaUrl}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div
            className="flex h-full w-full items-end justify-start bg-cover bg-center"
            style={{ background: reel.gradient }}
          >
            <div className="w-full bg-black/20 px-6 py-10 backdrop-blur-[2px]">
              <p className="max-w-md text-sm text-white/90">
                  Upload a video reel to get autoplay here.
              </p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

        <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Reels
        </div>

        <div className="pointer-events-none absolute right-5 top-5 rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
          <LivePostAge createdAt={reel.createdAt} initialLabel={reel.timeAgo} />
        </div>

        {paused ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-full bg-black/45 px-5 py-3 text-sm font-semibold backdrop-blur-md">
              Paused
            </div>
          </div>
        ) : null}
      </button>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-5 pb-24 pt-16">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-white">
            {reel.author} <span className="text-white/70">{reel.handle}</span>
          </p>
          <p className="pointer-events-auto text-sm text-white/90">
            <CaptionWithHashtags
              caption={reel.caption}
              hashtagClassName="font-semibold text-sky-200 transition hover:text-white"
            />
          </p>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <span>{reel.likes} likes</span>
            <span>{reel.comments} comments</span>
            <span>{reel.shareCount} shares</span>
            {reel.location ? <span>{reel.location}</span> : null}
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-5 right-5 z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onLikeToggle(reel.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold backdrop-blur-md transition ${
              reel.liked
                ? "border-red-400/70 bg-red-500/80 text-white"
                : "border-white/20 bg-black/35 text-white"
            }`}
          >
            Like {reel.likes}
          </button>
          <button
            type="button"
            onClick={() => onCommentOpen(reel.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1 font-semibold text-white backdrop-blur-md transition hover:bg-black/50"
          >
            Comment {reel.comments}
          </button>
          <button
            type="button"
            onClick={() => onSaveToggle(reel.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold backdrop-blur-md transition ${
              reel.saved
                ? "border-red-400/70 bg-red-500/80 text-white"
                : "border-white/20 bg-black/35 text-white"
            }`}
            aria-label={reel.saved ? "Remove from vault" : "Vault reel"}
            title={reel.saved ? "Vaulted" : "Vault"}
          >
            <SaveGlyph saved={reel.saved} />
            {reel.saved ? "Saved" : "Save"}
          </button>
        </div>
        <div className="relative flex flex-col items-end">
          <button
            type="button"
            data-share-trigger="true"
            onClick={() => onShareToggle(reel.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/50"
            aria-label="Share"
            aria-expanded={shareOpen}
          >
            Share {reel.shareCount}
          </button>
          {shareOpen ? (
            <div
              data-share-menu="true"
              className="absolute right-0 bottom-[calc(100%+0.6rem)] w-44 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-black/85 p-2 text-white shadow-xl backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => onShareToAccounts(reel)}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-white/90 transition hover:bg-white/10"
              >
                Share to account
              </button>
              <button
                type="button"
                onClick={() => onCopyLink(reel.id)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-white/90 transition hover:bg-white/10"
              >
                Copy link
              </button>
            </div>
          ) : null}
          {shareNotice ? (
            <span className="mt-2 text-[10px] text-white/70">{shareNotice}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<{ id: string; text: string } | null>(
    null,
  );
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentEntries, setCommentEntries] = useState<CommentEntry[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const shareNoticeTimerRef = useRef<number | null>(null);

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
    if (!sharePostId) {
      return;
    }

    const closeShareMenu = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest('[data-share-menu="true"]') ||
        target.closest('[data-share-trigger="true"]')
      ) {
        return;
      }

      setSharePostId(null);
    };

    document.addEventListener("mousedown", closeShareMenu);
    return () => document.removeEventListener("mousedown", closeShareMenu);
  }, [sharePostId]);

  useEffect(() => {
    return () => {
      if (shareNoticeTimerRef.current !== null) {
        window.clearTimeout(shareNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const discover = await loadScope("discover");
        const unique = new Map<string, ReelPost>();

        for (const post of discover) {
          if (post.kind === "Reel" && !unique.has(post.id)) {
            unique.set(post.id, post);
          }
        }

        setReels([...unique.values()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load reels.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const showShareNotice = (postId: string, textValue: string) => {
    setShareNotice({ id: postId, text: textValue });

    if (shareNoticeTimerRef.current !== null) {
      window.clearTimeout(shareNoticeTimerRef.current);
    }

    shareNoticeTimerRef.current = window.setTimeout(() => {
      setShareNotice(null);
      shareNoticeTimerRef.current = null;
    }, 2000);
  };

  const trackShare = async (postId: string) => {
    try {
      const payload = await req<{ shares: number }>(`/api/posts/${postId}/share`, {
        method: "POST",
      });
      setReels((current) =>
        current.map((reel) =>
          reel.id === postId ? { ...reel, shareCount: payload.shares } : reel,
        ),
      );
    } catch {
      // Ignore share tracking errors.
    }
  };

  const reportWatch = useCallback(async (postId: string, ms: number) => {
    if (ms <= 0) {
      return;
    }
    try {
      await req<{ watchTimeMs: number }>(`/api/posts/${postId}/watch`, {
        method: "POST",
        body: JSON.stringify({ ms }),
      });
    } catch {
      // Ignore watch time errors.
    }
  }, []);

  const buildShareUrl = (postId: string) => {
    if (typeof window === "undefined") {
      return `/posts/${postId}`;
    }

    return new URL(`/?post=${postId}`, window.location.origin).toString();
  };

  const copyShareLink = async (postId: string) => {
    const url = buildShareUrl(postId);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      showShareNotice(postId, "Link copied.");
      void trackShare(postId);
    } catch {
      showShareNotice(postId, "Could not copy the link.");
    } finally {
      setSharePostId(null);
    }
  };

  const shareToAccounts = async (reel: ReelPost) => {
    const url = buildShareUrl(reel.id);

    if (!navigator.share) {
      await copyShareLink(reel.id);
      return;
    }

    try {
      await navigator.share({
        title: `${reel.author} on Motion`,
        text: reel.caption ? reel.caption.slice(0, 120) : "Check this out on Motion.",
        url,
      });
      showShareNotice(reel.id, "Share sheet opened.");
      void trackShare(reel.id);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setSharePostId(null);
        return;
      }
      showShareNotice(reel.id, "Could not open share.");
    } finally {
      setSharePostId(null);
    }
  };

  const toggleSave = async (postId: string) => {
    try {
      const payload = await req<{ saved: boolean }>(`/api/posts/${postId}/save`, {
        method: "POST",
      });

      setReels((current) =>
        current.map((reel) =>
          reel.id === postId ? { ...reel, saved: Boolean(payload.saved) } : reel,
        ),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "Failed to vault reel.",
      );
    }
  };

  const toggleLike = async (postId: string) => {
    setReels((current) =>
      current.map((reel) =>
        reel.id === postId
          ? { ...reel, liked: !reel.liked, likes: reel.likes + (reel.liked ? -1 : 1) }
          : reel,
      ),
    );

    try {
      const payload = await req<{ liked: boolean; likes: number }>(
        `/api/posts/${postId}/like`,
        { method: "POST" },
      );
      setReels((current) =>
        current.map((reel) =>
          reel.id === postId
            ? { ...reel, liked: payload.liked, likes: payload.likes }
            : reel,
        ),
      );
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "Like failed.");
    }
  };

  const closeComments = () => {
    if (commentSubmitting) {
      return;
    }

    setCommentsPostId(null);
    setCommentEntries([]);
    setCommentsTotal(0);
    setCommentDraft("");
    setCommentsError(null);
  };

  const openComments = async (postId: string) => {
    setCommentsPostId(postId);
    setCommentsLoading(true);
    setCommentsError(null);
    setCommentEntries([]);
    setCommentDraft("");
    setSharePostId(null);
    setShareNotice(null);

    try {
      const payload = await req<{ comments: CommentEntry[]; total: number }>(
        `/api/posts/${postId}/comments`,
      );
      setCommentEntries(payload.comments);
      setCommentsTotal(payload.total);
    } catch (commentError) {
      setCommentsError(
        commentError instanceof Error ? commentError.message : "Failed to load comments.",
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();

    if (!commentsPostId) {
      return;
    }

    const textValue = commentDraft.trim();

    if (!textValue) {
      setCommentsError("Comment cannot be empty.");
      return;
    }

    setCommentSubmitting(true);
    setCommentsError(null);

    try {
      const payload = await req<{ comment: CommentEntry; total: number }>(
        `/api/posts/${commentsPostId}/comments`,
        { method: "POST", body: JSON.stringify({ text: textValue }) },
      );
      setCommentEntries((current) => [...current, payload.comment]);
      setCommentsTotal(payload.total);
      setCommentDraft("");
      setReels((current) =>
        current.map((reel) =>
          reel.id === commentsPostId ? { ...reel, comments: payload.total } : reel,
        ),
      );
    } catch (commentError) {
      setCommentsError(
        commentError instanceof Error ? commentError.message : "Failed to post comment.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const activeCommentsPost = useMemo(
    () => reels.find((reel) => reel.id === commentsPostId) ?? null,
    [commentsPostId, reels],
  );

  const handleShareToggle = (postId: string) => {
    setShareNotice(null);
    setSharePostId((current) => (current === postId ? null : postId));
  };

  const hasVideoReel = useMemo(
    () => reels.some((reel) => reel.mediaType === "video" && reel.mediaUrl),
    [reels],
  );

  if (loading) {
    return (
    <main className="grid min-h-screen place-items-center bg-black px-6 text-sm text-white/80">
      Loading reels...
    </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-center text-sm text-red-200">
        <div className="space-y-3">
          <p>{error}</p>
          <Link href="/" className="inline-flex rounded-full border border-white/20 px-4 py-2 text-white">
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  if (reels.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-center text-sm text-white/80">
        <div className="space-y-3">
          <p>No reels available yet.</p>
          <Link href="/" className="inline-flex rounded-full border border-white/20 px-4 py-2 text-white">
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <main
        className="motion-shell is-solid relative h-screen overflow-hidden bg-black"
        data-viewport={viewportMode}
      >
        <div className="motion-viewport h-full">
          <div className="relative h-full">
            <Link
              href="/"
              className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
            >
              Back to Feed
            </Link>
            <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
              <ViewportPicker mode={viewportMode} onChange={setViewportMode} />
              {!hasVideoReel ? (
                <div className="rounded-full border border-white/15 bg-black/35 px-4 py-2 text-[11px] font-medium text-white/80 backdrop-blur-md">
                  Upload reels with video for autoplay
                </div>
              ) : null}
            </div>
            <div className="h-full snap-y snap-mandatory overflow-y-auto">
              {reels.map((reel) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  onSaveToggle={toggleSave}
                  onLikeToggle={toggleLike}
                  onCommentOpen={openComments}
                  onWatch={reportWatch}
                  shareOpen={sharePostId === reel.id}
                  onShareToggle={handleShareToggle}
                  onShareToAccounts={shareToAccounts}
                  onCopyLink={copyShareLink}
                  shareNotice={shareNotice?.id === reel.id ? shareNotice.text : null}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {commentsPostId ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm"
          onClick={closeComments}
        >
          <section
            className="motion-surface w-full max-w-2xl p-5"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Comments"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Comments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeCommentsPost
                    ? `${activeCommentsPost.author} - ${commentsTotal} comments`
                    : `${commentsTotal} comments`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeComments}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
                aria-label="Close comments"
                disabled={commentSubmitting}
              >
                x
              </button>
            </div>

            {activeCommentsPost ? (
              <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {activeCommentsPost.author}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <CaptionWithHashtags caption={activeCommentsPost.caption} />
                </p>
              </div>
            ) : null}

            <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {commentsLoading ? (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
                  Loading comments...
                </p>
              ) : commentEntries.length > 0 ? (
                <>
                  {commentEntries.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: comment.avatarGradient }}
                        >
                          {comment.author
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {comment.author}
                            </p>
                            <p className="text-xs text-slate-500">{comment.handle}</p>
                            <p className="text-xs text-slate-500">{comment.time}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {commentsTotal > commentEntries.length ? (
                    <p className="px-1 text-xs text-slate-500">
                      Showing {commentEntries.length} visible comments.{" "}
                      {commentsTotal - commentEntries.length} older comments are not
                      loaded in this preview.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
                  No comments yet. Start the conversation.
                </p>
              )}
            </div>

            <form onSubmit={submitComment} className="mt-4 space-y-3">
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                placeholder="Write a comment..."
                maxLength={280}
                autoFocus
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    {commentDraft.trim().length}/280
                  </p>
                  {commentsError ? (
                    <p className="mt-1 text-xs text-red-700">{commentsError}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={commentSubmitting || commentsLoading}
                  className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {commentSubmitting ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
