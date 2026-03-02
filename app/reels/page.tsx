"use client";

import LivePostAge from "@/components/live-post-age";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
  gradient: string;
  createdAt: string;
  timeAgo: string;
  mediaUrl?: string;
  mediaType?: MediaType;
};

type ReelResponse = {
  posts: ReelPost[];
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

function sortByNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
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
}: {
  reel: ReelPost;
  onSaveToggle: (postId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

        video.pause();
      },
      { threshold: 0.65 },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [paused]);

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

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-5 pb-8 pt-16">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-semibold">
              {reel.author} <span className="text-white/70">{reel.handle}</span>
            </p>
            <p className="text-sm text-white/90">{reel.caption}</p>
            <div className="flex items-center gap-3 text-xs text-white/70">
              <span>{reel.likes} likes</span>
              <span>{reel.comments} comments</span>
              {reel.location ? <span>{reel.location}</span> : null}
            </div>
          </div>
        </div>

        {paused ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-full bg-black/45 px-5 py-3 text-sm font-semibold backdrop-blur-md">
              Paused
            </div>
          </div>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onSaveToggle(reel.id)}
        className={`absolute bottom-8 right-5 z-10 grid h-11 w-11 place-items-center rounded-full border backdrop-blur-md ${
          reel.saved
            ? "border-red-400/50 bg-red-500 text-white"
            : "border-white/20 bg-black/35 text-white"
        }`}
        aria-label={reel.saved ? "Remove from vault" : "Vault reel"}
        title={reel.saved ? "Vaulted" : "Vault"}
      >
        <SaveGlyph saved={reel.saved} />
      </button>
    </section>
  );
}

export default function ReelsPage() {
  const [reels, setReels] = useState<ReelPost[]>([]);
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
        const [following, discover] = await Promise.all([
          loadScope("following"),
          loadScope("discover"),
        ]);
        const merged = [...following, ...discover];
        const unique = new Map<string, ReelPost>();

        for (const post of merged) {
          if (post.kind === "Reel" && !unique.has(post.id)) {
            unique.set(post.id, post);
          }
        }

        setReels(sortByNewest([...unique.values()]));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load reels.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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
        throw new Error(payload.error ?? "Failed to vault reel.");
      }

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
              <ReelCard key={reel.id} reel={reel} onSaveToggle={toggleSave} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
