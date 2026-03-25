"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import UserAvatar from "@/components/user-avatar";
import { INTEREST_OPTIONS, type InterestKey } from "@/lib/interests";
import {
  getRandomChatCountryLabel,
  RANDOM_CHAT_COUNTRIES,
} from "@/lib/random-chat";
import type {
  RandomChatQueueDto,
  RandomChatSessionDto,
} from "@/lib/server/types";

type User = {
  id: string;
  name: string;
  interests?: InterestKey[];
  avatarGradient: string;
  avatarUrl?: string;
};

type ViewportMode = "desktop" | "tablet" | "mobile";

type RandomChatStatePayload = {
  queue: RandomChatQueueDto | null;
  session: RandomChatSessionDto | null;
};

function isRtcSessionDescriptionInit(value: unknown): value is RTCSessionDescriptionInit {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as { type?: unknown; sdp?: unknown };
  return (
    (candidate.type === "offer" ||
      candidate.type === "answer" ||
      candidate.type === "pranswer" ||
      candidate.type === "rollback") &&
    (typeof candidate.sdp === "string" || typeof candidate.sdp === "undefined")
  );
}

function isRtcIceCandidateInit(value: unknown): value is RTCIceCandidateInit {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as { candidate?: unknown };
  return typeof candidate.candidate === "string";
}

function getVideoConstraints(): MediaTrackConstraints {
  return {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: "user",
  };
}

function formatWaitingSince(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.max(1, Math.floor(diff / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers, cache: "no-store" });

  if (response.status === 401) {
    throw new Error("Unauthorized");
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

export default function RandomChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [queue, setQueue] = useState<RandomChatQueueDto | null>(null);
  const [session, setSession] = useState<RandomChatSessionDto | null>(null);
  const [country, setCountry] = useState("");
  const [preferredCountry, setPreferredCountry] = useState("");
  const [preferredInterests, setPreferredInterests] = useState<InterestKey[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState("new");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIdsRef = useRef<string[]>([]);
  const currentSessionRef = useRef<RandomChatSessionDto | null>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const offeredSessionIdRef = useRef<string | null>(null);
  const deliberateExitRef = useRef(false);

  const partner = session?.otherUser ?? null;

  const stateLabel = useMemo(() => {
    if (session?.status === "active") {
      return "Live now";
    }

    if (session?.status === "connecting") {
      return connectionState === "connected" ? "Connecting media..." : "Connecting...";
    }

    if (queue) {
      return "Looking for someone new...";
    }

    return "Not connected";
  }, [connectionState, queue, session?.status]);

  const selectedInterestOptions = useMemo(
    () => INTEREST_OPTIONS.filter((option) => preferredInterests.includes(option.id)),
    [preferredInterests],
  );

  const attachVideoElementStream = useCallback(
    (
      element: HTMLVideoElement | null,
      stream: MediaStream | null,
      { muted = false }: { muted?: boolean } = {},
    ) => {
      if (!element) {
        return;
      }

      if (element.srcObject !== stream) {
        element.srcObject = stream;
      }

      element.muted = muted;

      if (stream) {
        void element.play().catch(() => undefined);
      }
    },
    [],
  );

  const clearRemoteStream = useCallback(() => {
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    attachVideoElementStream(remoteVideoRef.current, null);
    setRemoteReady(false);
  }, [attachVideoElementStream]);

  const resetRtcState = useCallback(
    ({ stopLocal = true }: { stopLocal?: boolean } = {}) => {
      if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.close();
        peerRef.current = null;
      }

      pendingIceRef.current = [];
      processedSignalIdsRef.current = [];
      offeredSessionIdRef.current = null;
      setConnectionState("new");
      clearRemoteStream();

      if (stopLocal) {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        attachVideoElementStream(localVideoRef.current, null, { muted: true });
        setLocalReady(false);
      }
    },
    [attachVideoElementStream, clearRemoteStream],
  );

  const syncSessionState = useCallback(
    (payload: RandomChatStatePayload) => {
      const previousSessionId = previousSessionIdRef.current;
      const nextSessionId = payload.session?.id ?? null;

      if (previousSessionId && previousSessionId !== nextSessionId && !deliberateExitRef.current) {
        setNote("This chat ended. You can jump into the next one whenever you're ready.");
      }

      if (previousSessionId !== nextSessionId) {
        resetRtcState();
      }

      previousSessionIdRef.current = nextSessionId;
      currentSessionRef.current = payload.session;
      setQueue(payload.queue);
      setSession(payload.session);

      if (!payload.session) {
        deliberateExitRef.current = false;
      }
    },
    [resetRtcState],
  );

  const loadRandomChatState = useCallback(async () => {
    const payload = await req<RandomChatStatePayload>("/api/random-chat");
    syncSessionState(payload);
  }, [syncSessionState]);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      attachVideoElementStream(localVideoRef.current, localStreamRef.current, {
        muted: true,
      });
      setLocalReady(localStreamRef.current.getVideoTracks().length > 0);
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone access is not available here.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: getVideoConstraints(),
    });

    localStreamRef.current = stream;
    attachVideoElementStream(localVideoRef.current, stream, { muted: true });
    setMuted(false);
    setCameraEnabled(true);
    setLocalReady(stream.getVideoTracks().length > 0);
    return stream;
  }, [attachVideoElementStream]);

  const postSessionAction = useCallback(async (body: Record<string, unknown>) => {
    const activeSession = currentSessionRef.current;

    if (!activeSession) {
      throw new Error("No active random chat.");
    }

    return req<{ session: RandomChatSessionDto }>(`/api/random-chat/${activeSession.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }, []);

  const sendSignal = useCallback(
    async (toUserId: string, signalType: "offer" | "answer" | "ice", payload: unknown) => {
      await postSessionAction({
        action: "signal",
        toUserId,
        signalType,
        payload,
      });
    },
    [postSessionAction],
  );

  const flushPendingIce = useCallback(async (peer: RTCPeerConnection) => {
    if (pendingIceRef.current.length === 0) {
      return;
    }

    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];

    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale ICE candidates.
      }
    }
  }, []);

  const ensurePeerConnection = useCallback(
    async (remoteUserId: string) => {
      if (peerRef.current) {
        return peerRef.current;
      }

      const stream = await ensureLocalStream();
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(remoteUserId, "ice", event.candidate.toJSON());
        }
      };

      peer.ontrack = (event) => {
        const remoteStream = remoteStreamRef.current ?? new MediaStream();
        remoteStreamRef.current = remoteStream;

        event.streams[0]?.getTracks().forEach((track) => {
          if (!remoteStream.getTracks().some((candidate) => candidate.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });

        if (
          event.streams.length === 0 &&
          !remoteStream.getTracks().some((track) => track.id === event.track.id)
        ) {
          remoteStream.addTrack(event.track);
        }

        attachVideoElementStream(remoteVideoRef.current, remoteStream);
        setRemoteReady(remoteStream.getVideoTracks().length > 0);
      };

      peer.onconnectionstatechange = () => {
        setConnectionState(peer.connectionState);
      };

      peerRef.current = peer;
      return peer;
    },
    [attachVideoElementStream, ensureLocalStream, sendSignal],
  );

  const joinQueue = useCallback(async () => {
    if (!country) {
      setError("Choose your country first so we can make location filtering work properly.");
      return;
    }

    setBusy(true);
    setError(null);
    setNote(null);

    try {
      const payload = await req<RandomChatStatePayload>("/api/random-chat", {
        method: "POST",
        body: JSON.stringify({
          action: "join",
          country,
          preferredCountry,
          preferredInterests,
        }),
      });
      syncSessionState(payload);
      setNote(
        payload.session
          ? "Match found. We're bringing video up now."
          : "You're in the queue. Motion is looking for the right person.",
      );
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Could not join random chat.",
      );
    } finally {
      setBusy(false);
    }
  }, [country, preferredCountry, preferredInterests, syncSessionState]);

  const leaveQueue = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      const payload = await req<RandomChatStatePayload>("/api/random-chat", {
        method: "POST",
        body: JSON.stringify({ action: "leave" }),
      });
      syncSessionState(payload);
      setNote("You left the queue.");
    } catch (leaveError) {
      setError(
        leaveError instanceof Error ? leaveError.message : "Could not leave the queue.",
      );
    } finally {
      setBusy(false);
    }
  }, [syncSessionState]);

  const endCurrentChat = useCallback(
    async (action: "skip" | "leave") => {
      if (!currentSessionRef.current) {
        return;
      }

      deliberateExitRef.current = true;
      setBusy(true);
      setError(null);

      try {
        await postSessionAction({ action });
        resetRtcState();
        setSession(null);
        setQueue(null);
        currentSessionRef.current = null;
        previousSessionIdRef.current = null;
        if (action === "skip") {
          await joinQueue();
        } else {
          setNote("Chat ended.");
        }
      } catch (leaveError) {
        deliberateExitRef.current = false;
        setError(
          leaveError instanceof Error ? leaveError.message : "Could not end this chat.",
        );
      } finally {
        setBusy(false);
      }
    },
    [joinQueue, postSessionAction, resetRtcState],
  );

  const reportChat = useCallback(async () => {
    if (!currentSessionRef.current) {
      return;
    }

    const reason =
      typeof window === "undefined"
        ? ""
        : window.prompt("Tell us why you're reporting this chat (optional).") ?? "";

    deliberateExitRef.current = true;
    setBusy(true);
    setError(null);

    try {
      await postSessionAction({
        action: "report",
        reason,
      });
      resetRtcState();
      setSession(null);
      setQueue(null);
      currentSessionRef.current = null;
      previousSessionIdRef.current = null;
      setNote("Report sent. That match is blocked from showing up again.");
    } catch (reportError) {
      deliberateExitRef.current = false;
      setError(
        reportError instanceof Error ? reportError.message : "Could not report this chat.",
      );
    } finally {
      setBusy(false);
    }
  }, [postSessionAction, resetRtcState]);

  const syncMediaState = useCallback(
    async (nextMuted: boolean, nextCameraEnabled: boolean) => {
      const stream = localStreamRef.current;

      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = nextCameraEnabled;
        });
      }

      setMuted(nextMuted);
      setCameraEnabled(nextCameraEnabled);

      if (currentSessionRef.current) {
        try {
          await postSessionAction({
            action: "media",
            audioEnabled: !nextMuted,
            videoEnabled: nextCameraEnabled,
          });
        } catch {
          // Keep local controls responsive even if metadata sync lags.
        }
      }
    },
    [postSessionAction],
  );

  useEffect(() => {
    currentSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedViewport = window.localStorage.getItem("motion-viewport");
    if (
      storedViewport === "desktop" ||
      storedViewport === "tablet" ||
      storedViewport === "mobile"
    ) {
      setViewportMode(storedViewport);
    }

    const storedCountry = window.localStorage.getItem("motion-random-country");
    const storedPreferredCountry = window.localStorage.getItem(
      "motion-random-preferred-country",
    );
    const storedInterests = window.localStorage.getItem("motion-random-interests");

    if (storedCountry) {
      setCountry(storedCountry);
    }

    if (storedPreferredCountry) {
      setPreferredCountry(storedPreferredCountry);
    }

    if (storedInterests) {
      try {
        const parsed = JSON.parse(storedInterests) as unknown;
        if (Array.isArray(parsed)) {
          setPreferredInterests(
            parsed.filter((value): value is InterestKey =>
              INTEREST_OPTIONS.some((option) => option.id === value),
            ),
          );
        }
      } catch {
        // Ignore invalid persisted preferences.
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("motion-viewport", viewportMode);
    if (country) {
      window.localStorage.setItem("motion-random-country", country);
    }
    window.localStorage.setItem("motion-random-preferred-country", preferredCountry);
    window.localStorage.setItem(
      "motion-random-interests",
      JSON.stringify(preferredInterests),
    );
  }, [country, preferredCountry, preferredInterests, viewportMode]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [mePayload, randomPayload] = await Promise.all([
          req<{ user: User }>("/api/auth/me"),
          req<RandomChatStatePayload>("/api/random-chat"),
        ]);

        if (cancelled) {
          return;
        }

        setUser(mePayload.user);
        setPreferredInterests((current) =>
          current.length > 0 ? current : mePayload.user.interests ?? [],
        );
        syncSessionState(randomPayload);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not open random chat.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      resetRtcState();
    };
  }, [resetRtcState, syncSessionState]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadRandomChatState().catch(() => undefined);
    }, session ? 1200 : queue ? 2200 : 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadRandomChatState, queue, session, user]);

  useEffect(() => {
    if (!session || !user) {
      return;
    }

    let cancelled = false;

    const boot = async () => {
      try {
        await ensureLocalStream();

        if (cancelled) {
          return;
        }

        await postSessionAction({ action: "join" });
      } catch (bootError) {
        if (!cancelled) {
          setError(
            bootError instanceof Error
              ? bootError.message
              : "Could not start camera and microphone for this chat.",
          );
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [ensureLocalStream, postSessionAction, session, user]);

  useEffect(() => {
    if (!session || !partner || !session.isInitiator) {
      return;
    }

    if (offeredSessionIdRef.current === session.id) {
      return;
    }

    let cancelled = false;

    const createOffer = async () => {
      try {
        const peer = await ensurePeerConnection(partner.userId);

        if (cancelled || peer.signalingState !== "stable" || peer.localDescription) {
          return;
        }

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        offeredSessionIdRef.current = session.id;
        await sendSignal(partner.userId, "offer", offer);
      } catch (offerError) {
        if (!cancelled) {
          setError(
            offerError instanceof Error
              ? offerError.message
              : "Could not start the random video connection.",
          );
        }
      }
    };

    void createOffer();

    return () => {
      cancelled = true;
    };
  }, [ensurePeerConnection, partner, sendSignal, session]);

  useEffect(() => {
    if (!session || !user) {
      return;
    }

    const incomingSignals = session.signals.filter(
      (signal) =>
        signal.toUserId === user.id &&
        !processedSignalIdsRef.current.includes(signal.id),
    );

    if (incomingSignals.length === 0) {
      return;
    }

    let cancelled = false;

    const processSignals = async () => {
      for (const signal of incomingSignals) {
        processedSignalIdsRef.current.push(signal.id);

        const peer = await ensurePeerConnection(signal.fromUserId);

        if (cancelled) {
          return;
        }

        try {
          if (signal.type === "offer") {
            if (!isRtcSessionDescriptionInit(signal.payload)) {
              continue;
            }

            await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
            await flushPendingIce(peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await sendSignal(signal.fromUserId, "answer", answer);
          } else if (signal.type === "answer") {
            if (!isRtcSessionDescriptionInit(signal.payload)) {
              continue;
            }

            await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
            await flushPendingIce(peer);
          } else if (signal.type === "ice") {
            if (!isRtcIceCandidateInit(signal.payload)) {
              continue;
            }

            if (peer.remoteDescription) {
              await peer.addIceCandidate(new RTCIceCandidate(signal.payload));
            } else {
              pendingIceRef.current.push(signal.payload);
            }
          }
        } catch {
          // Ignore stale signaling errors between skip and reconnect cycles.
        }
      }
    };

    void processSignals();

    return () => {
      cancelled = true;
    };
  }, [ensurePeerConnection, flushPendingIce, sendSignal, session, user]);

  useEffect(() => {
    return () => {
      if (queue && !session) {
        void fetch("/api/random-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
          keepalive: true,
        }).catch(() => undefined);
      }

      if (currentSessionRef.current) {
        void fetch(`/api/random-chat/${currentSessionRef.current.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
  }, [queue, session]);

  if (loading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-viewport">
          <section className="motion-surface p-6 text-sm text-slate-500">
            Opening Random Chat...
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-6" data-viewport={viewportMode}>
      <div className="motion-viewport space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Feed
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/profile" className="rounded-full" aria-label="Open profile">
                <UserAvatar
                  name={user.name}
                  avatarGradient={user.avatarGradient}
                  avatarUrl={user.avatarUrl}
                  className="h-10 w-10 border border-[var(--line)]"
                  textClassName="text-xs font-bold text-white"
                  sizes="40px"
                />
              </Link>
            ) : null}
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Random Chat</p>
          </div>
        </div>

        {error ? (
          <div className="motion-surface border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        {note ? (
          <div className="motion-surface border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {note}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="motion-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Safe matching
            </p>
            <h1
              className="mt-2 text-2xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Meet someone new with filters that actually matter.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Motion matches signed-in members by interests and country, then opens a private WebRTC room with skip and report built in.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Your country
                </span>
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-[var(--brand)]"
                >
                  <option value="">Choose country</option>
                  {RANDOM_CHAT_COUNTRIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Match country
                </span>
                <select
                  value={preferredCountry}
                  onChange={(event) => setPreferredCountry(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-[var(--brand)]"
                >
                  <option value="">Anywhere</option>
                  {RANDOM_CHAT_COUNTRIES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Match interests
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreferredInterests([])}
                    className="text-[11px] font-semibold text-slate-500 hover:text-[var(--brand)]"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((option) => {
                    const selected = preferredInterests.includes(option.id);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setPreferredInterests((current) =>
                            current.includes(option.id)
                              ? current.filter((interest) => interest !== option.id)
                              : [...current, option.id],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                            : "border-[var(--line)] bg-white text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!queue && !session ? (
                  <button
                    type="button"
                    onClick={() => void joinQueue()}
                    disabled={busy}
                    className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busy ? "Joining..." : "Start random chat"}
                  </button>
                ) : null}
                {queue && !session ? (
                  <button
                    type="button"
                    onClick={() => void leaveQueue()}
                    disabled={busy}
                    className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {busy ? "Updating..." : "Leave queue"}
                  </button>
                ) : null}
                {session ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void endCurrentChat("skip")}
                      disabled={busy}
                      className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Working..." : "Next person"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void endCurrentChat("leave")}
                      disabled={busy}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                    >
                      End chat
                    </button>
                    <button
                      type="button"
                      onClick={() => void reportChat()}
                      disabled={busy}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60"
                    >
                      Report
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className="motion-surface p-5">
            {session && partner ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={partner.name}
                      avatarGradient={partner.avatarGradient}
                      avatarUrl={partner.avatarUrl}
                      className="h-14 w-14"
                      textClassName="text-sm font-bold text-white"
                      sizes="56px"
                    />
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{partner.name}</p>
                      <p className="text-sm text-slate-500">
                        {partner.country ? getRandomChatCountryLabel(partner.country) : "Country hidden"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{stateLabel}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {partner.sharedInterests.length > 0 ? (
                    partner.sharedInterests.map((interest) => (
                      <span
                        key={`shared-interest-${interest}`}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                      >
                        Shared: {INTEREST_OPTIONS.find((option) => option.id === interest)?.label ?? interest}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                      No shared interests surfaced yet
                    </span>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-slate-950">
                  <div className="aspect-[16/10] w-full">
                    <video
                      ref={remoteVideoRef}
                      className={`h-full w-full object-cover transition ${remoteReady ? "opacity-100" : "opacity-0"}`}
                      playsInline
                      autoPlay
                    />
                    {!remoteReady ? (
                      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top,#20355b,transparent_55%),linear-gradient(180deg,#091224,#050914)] text-white">
                        <div className="text-center">
                          <UserAvatar
                            name={partner.name}
                            avatarGradient={partner.avatarGradient}
                            avatarUrl={partner.avatarUrl}
                            className="mx-auto h-20 w-20"
                            textClassName="text-lg font-bold text-white"
                            sizes="80px"
                          />
                          <p className="mt-4 text-xl font-semibold">{partner.name}</p>
                          <p className="mt-1 text-sm text-white/70">
                            {session.status === "active" ? "Waiting for video..." : "Bringing the connection up..."}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl">
                    <video
                      ref={localVideoRef}
                      className={`h-full w-full object-cover transition ${localReady && cameraEnabled ? "opacity-100" : "opacity-0"}`}
                      playsInline
                      autoPlay
                      muted
                    />
                    {!localReady || !cameraEnabled ? (
                      <div className="absolute inset-0 grid place-items-center bg-slate-900 text-white text-xs font-semibold">
                        {cameraEnabled ? "Starting..." : "Camera off"}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void syncMediaState(!muted, cameraEnabled)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${muted ? "bg-amber-100 text-amber-700" : "border border-[var(--line)] bg-white text-slate-700"}`}
                  >
                    {muted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void syncMediaState(muted, !cameraEnabled)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${!cameraEnabled ? "bg-amber-100 text-amber-700" : "border border-[var(--line)] bg-white text-slate-700"}`}
                  >
                    {cameraEnabled ? "Camera off" : "Camera on"}
                  </button>
                </div>
              </div>
            ) : queue ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] border border-dashed border-[var(--line)] bg-[radial-gradient(circle_at_top,#dfeeff,transparent_55%),linear-gradient(180deg,#ffffff,#f4f7fb)] px-8 text-center">
                <div className="relative h-14 w-14">
                  <span className="absolute inset-0 rounded-full bg-[var(--brand)]/20 animate-ping" />
                  <span className="absolute inset-1 rounded-full bg-[var(--brand)]/35" />
                  <span className="absolute inset-[12px] rounded-full bg-[var(--brand)]" />
                </div>
                <h2 className="mt-5 text-3xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
                  Looking for your next match...
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-500">
                  In queue for {formatWaitingSince(queue.createdAt)}. Motion is checking interests and country fit before it opens the room.
                </p>
              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] border border-dashed border-[var(--line)] bg-[radial-gradient(circle_at_top,#dfeeff,transparent_55%),linear-gradient(180deg,#ffffff,#f4f7fb)] px-8 text-center">
                <h2 className="text-3xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
                  Ready when you are.
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-500">
                  Set your country, choose any interest lanes you want to prioritize, and Motion will pair you with a signed-in member in a private WebRTC room.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {(selectedInterestOptions.length > 0 ? selectedInterestOptions : INTEREST_OPTIONS.slice(0, 4)).map((interest) => (
                    <span
                      key={`hero-interest-${interest.id}`}
                      className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {interest.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
