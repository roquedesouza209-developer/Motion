"use client";

import LivePostAge from "@/components/live-post-age";
import UserAvatar from "@/components/user-avatar";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type LiveSession = {
  id: string;
  title: string;
  createdAt: string;
  viewerCount: number;
  isHost: boolean;
  isViewer: boolean;
  isActive: boolean;
  host: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  };
};

type LiveComment = {
  id: string;
  author: string;
  handle: string;
  avatarGradient: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  time: string;
};

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

function LiveAvatar({
  name,
  avatarGradient,
  avatarUrl,
  size = "h-14 w-14",
}: {
  name: string;
  avatarGradient: string;
  avatarUrl?: string;
  size?: string;
}) {
  return (
    <UserAvatar
      name={name}
      avatarGradient={avatarGradient}
      avatarUrl={avatarUrl}
      className={`${size} shadow-[0_12px_30px_-18px_rgba(15,23,42,0.8)]`}
      textClassName="text-sm font-semibold text-white"
      sizes="56px"
    />
  );
}

export default function LiveRoomPage() {
  const params = useParams<{ liveId: string }>();
  const liveId = Array.isArray(params.liveId) ? params.liveId[0] : params.liveId;
  const [session, setSession] = useState<LiveSession | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [endingLive, setEndingLive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!liveId) {
      setLoading(false);
      setError("Live session not found.");
      return;
    }

    let cancelled = false;

    const load = async (joinIfNeeded: boolean) => {
      try {
        const payload = await req<{ session: LiveSession; comments: LiveComment[] }>(
          `/api/live/${liveId}`,
        );

        if (cancelled) {
          return;
        }

        setSession(payload.session);
        setComments(payload.comments);
        setError(null);
        setLoading(false);

        if (
          joinIfNeeded &&
          !payload.session.isHost &&
          payload.session.isActive &&
          !joinedRef.current
        ) {
          const joinedPayload = await req<{ viewerCount: number }>(
            `/api/live/${liveId}/join`,
            { method: "POST" },
          );

          if (cancelled) {
            return;
          }

          joinedRef.current = true;
          setJoined(true);
          setSession((current) =>
            current
              ? {
                  ...current,
                  viewerCount: joinedPayload.viewerCount,
                  isViewer: true,
                }
              : current,
          );
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setLoading(false);
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load live room.",
        );
      }
    };

    void load(true);
    const interval = window.setInterval(() => {
      void load(false);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);

      if (joinedRef.current) {
        void fetch(`/api/live/${liveId}/leave`, {
          method: "POST",
          keepalive: true,
        }).catch(() => undefined);
      }
    };
  }, [liveId]);

  useEffect(() => {
    if (!session?.isHost || !session.isActive) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera preview is not available in this browser.");
      return;
    }

    let cancelled = false;
    const videoElement = videoRef.current;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoElement) {
          videoElement.srcObject = stream;
          void videoElement.play().catch(() => undefined);
        }
        setCameraReady(true);
        setCameraError(null);
      } catch {
        if (!cancelled) {
          setCameraReady(false);
          setCameraError("Allow camera access to preview your live broadcast.");
        }
      }
    };

    void startPreview();

    return () => {
      cancelled = true;
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [session?.isHost, session?.isActive]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();

    const text = commentDraft.trim();
    if (!text || !liveId) {
      return;
    }

    setCommentSubmitting(true);
    setError(null);

    try {
      const payload = await req<{ comment: LiveComment }>(`/api/live/${liveId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      setComments((current) => [...current, payload.comment]);
      setCommentDraft("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to post live comment.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const endLive = async () => {
    if (!liveId) {
      return;
    }

    setEndingLive(true);
    setError(null);

    try {
      await req<{ ok: boolean }>(`/api/live/${liveId}/stop`, { method: "POST" });
      setSession((current) => (current ? { ...current, isActive: false } : current));
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Failed to end live.");
    } finally {
      setEndingLive(false);
    }
  };

  if (loading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-6xl p-6">Loading live room...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-3xl p-6">
          <p className="text-sm text-red-600">{error ?? "Live session not found."}</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-6">
      <div className="motion-viewport">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Feed
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-500 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(244,63,94,0.8)]">
              LIVE
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
              {session.viewerCount} watching
            </span>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.9fr)]">
          <section className="motion-surface overflow-hidden p-0">
            <div className="relative min-h-[28rem] overflow-hidden rounded-[inherit] bg-[radial-gradient(circle_at_top,#3b82f655,#0f172acc_55%),linear-gradient(140deg,#111827,#0b1220,#020617)]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] opacity-25" />
              {session.isHost && cameraReady ? (
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center px-6">
                  <div className="text-center">
                    <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/10 p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl">
                      <LiveAvatar
                        name={session.host.name}
                        avatarGradient={session.host.avatarGradient}
                        avatarUrl={session.host.avatarUrl}
                        size="h-20 w-20"
                      />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-white">
                      {session.host.name} is broadcasting live
                    </p>
                    <p className="mt-2 text-sm text-white/75">
                      Viewers can join, chat, and follow the stream in real time.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 rounded-full bg-black/35 px-3 py-2 text-white backdrop-blur-md">
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold">
                    LIVE
                  </span>
                  <LivePostAge createdAt={session.createdAt} initialLabel="Just now" />
                </div>
                <div className="rounded-full bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md">
                  {session.viewerCount} viewers
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 text-white">
                <div className="max-w-lg">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/65">
                    {session.host.handle}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                    {session.title}
                  </h1>
                  <p className="mt-2 text-sm text-white/80">
                    {session.isHost
                      ? "Your room is live. Stay here to keep the broadcast running."
                      : "You joined the live room. Comments refresh automatically while the stream is active."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {session.isHost ? (
                    <button
                      type="button"
                      onClick={endLive}
                      disabled={endingLive || !session.isActive}
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md disabled:opacity-60"
                    >
                      {endingLive ? "Ending..." : session.isActive ? "End Live" : "Live Ended"}
                    </button>
                  ) : (
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-md">
                      {joined || session.isViewer ? "Joined live" : "Joining..."}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {cameraError ? (
              <div className="border-t border-[var(--line)] bg-white px-5 py-4 text-sm text-amber-700">
                {cameraError}
              </div>
            ) : null}

            {!session.isActive ? (
              <div className="border-t border-[var(--line)] bg-white px-5 py-4 text-sm text-slate-600">
                This live broadcast has ended. You can head back to the feed whenever you&apos;re ready.
              </div>
            ) : null}
          </section>

          <aside className="motion-surface flex min-h-[28rem] flex-col p-0">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <div className="flex items-center gap-3">
                <LiveAvatar
                  name={session.host.name}
                  avatarGradient={session.host.avatarGradient}
                  avatarUrl={session.host.avatarUrl}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {session.host.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {session.host.handle} - {session.viewerCount} viewers
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <LiveAvatar
                        name={comment.author}
                        avatarGradient={comment.avatarGradient}
                        avatarUrl={comment.avatarUrl}
                        size="h-9 w-9"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {comment.author}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {comment.handle} - {comment.time}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{comment.text}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Live comments will show up here as viewers react.
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line)] px-5 py-4">
              {error ? (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <form onSubmit={submitComment} className="space-y-3">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                  placeholder="Drop a live comment..."
                  disabled={!session.isActive || commentSubmitting}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">
                    {session.isHost
                      ? "Hosts can comment too."
                      : "Comments refresh automatically for everyone in the room."}
                  </p>
                  <button
                    type="submit"
                    disabled={!session.isActive || commentSubmitting || !commentDraft.trim()}
                    className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {commentSubmitting ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
