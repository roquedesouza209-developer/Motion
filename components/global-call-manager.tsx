"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatCallOverlay from "@/components/home/chat-call-overlay";
import {
  MOTION_CALL_STATE_EVENT,
  MOTION_CALL_SYNC_REQUEST_EVENT,
  MOTION_START_CALL_EVENT,
  type MotionCallStateDetail,
  type MotionStartCallDetail,
} from "@/lib/call-events";
import type { CallMode, CallSessionDto, CallSignalDto } from "@/lib/server/types";

type CallSession = CallSessionDto;
type CallSignal = CallSignalDto;

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

function formatLiveCallDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (init?.body && !isFormData && !headers.has("Content-Type")) {
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

export default function GlobalCallManager() {
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [callStartingMode, setCallStartingMode] = useState<CallMode | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [callVideoEnabled, setCallVideoEnabled] = useState(false);
  const [localCallVideoReady, setLocalCallVideoReady] = useState(false);
  const [remoteCallVideoReady, setRemoteCallVideoReady] = useState(false);
  const [callConnectionState, setCallConnectionState] = useState("new");
  const [callDurationTick, setCallDurationTick] = useState(() => Date.now());

  const callPeerRef = useRef<RTCPeerConnection | null>(null);
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const remoteCallStreamRef = useRef<MediaStream | null>(null);
  const localCallVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteCallVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const previousCallIdRef = useRef<string | null>(null);
  const processedCallSignalIdsRef = useRef<string[]>([]);
  const pendingRemoteIceRef = useRef<RTCIceCandidateInit[]>([]);
  const publishedCallStateRef = useRef<{
    id: string | null;
    status: CallSession["status"] | null;
    conversationId: string | null;
  }>({
    id: null,
    status: null,
    conversationId: null,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const ringbackTimerRef = useRef<number | null>(null);

  const attachLocalCallPreview = useCallback((stream: MediaStream | null) => {
    const element = localCallVideoRef.current;

    if (!element) {
      return;
    }

    element.srcObject = stream;

    if (stream) {
      void element.play().catch(() => undefined);
    }
  }, []);

  const attachRemoteCallPreview = useCallback((stream: MediaStream | null) => {
    const element = remoteCallVideoRef.current;

    if (!element) {
      return;
    }

    element.srcObject = stream;

    if (stream) {
      void element.play().catch(() => undefined);
    }
  }, []);

  const stopToneLoops = useCallback(() => {
    if (ringtoneTimerRef.current !== null) {
      window.clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }

    if (ringbackTimerRef.current !== null) {
      window.clearInterval(ringbackTimerRef.current);
      ringbackTimerRef.current = null;
    }
  }, []);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch {
        return audioContextRef.current;
      }
    }

    return audioContextRef.current;
  }, []);

  const playToneBurst = useCallback(
    async (frequencies: number[], durationMs: number, gapMs: number, gainValue: number) => {
      const audioContext = await ensureAudioContext();

      if (!audioContext) {
        return;
      }

      const now = audioContext.currentTime + 0.02;
      const durationSeconds = durationMs / 1000;
      const gapSeconds = gapMs / 1000;

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = now + index * (durationSeconds + gapSeconds);
        const stopAt = startAt + durationSeconds;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(startAt);
        oscillator.stop(stopAt + 0.04);
      });
    },
    [ensureAudioContext],
  );

  const startIncomingRingtone = useCallback(() => {
    if (ringtoneTimerRef.current !== null) {
      return;
    }

    stopToneLoops();
    void playToneBurst([784, 659, 784], 180, 90, 0.035);
    ringtoneTimerRef.current = window.setInterval(() => {
      void playToneBurst([784, 659, 784], 180, 90, 0.035);
    }, 2400);
  }, [playToneBurst, stopToneLoops]);

  const startOutgoingRingback = useCallback(() => {
    if (ringbackTimerRef.current !== null) {
      return;
    }

    stopToneLoops();
    void playToneBurst([440, 554], 260, 180, 0.03);
    ringbackTimerRef.current = window.setInterval(() => {
      void playToneBurst([440, 554], 260, 180, 0.03);
    }, 2800);
  }, [playToneBurst, stopToneLoops]);

  const teardownCallConnection = useCallback(() => {
    stopToneLoops();

    if (callPeerRef.current) {
      callPeerRef.current.onicecandidate = null;
      callPeerRef.current.ontrack = null;
      callPeerRef.current.onconnectionstatechange = null;
      callPeerRef.current.close();
      callPeerRef.current = null;
    }

    if (localCallStreamRef.current) {
      localCallStreamRef.current.getTracks().forEach((track) => track.stop());
      localCallStreamRef.current = null;
    }

    if (remoteCallStreamRef.current) {
      remoteCallStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteCallStreamRef.current = null;
    }

    currentCallIdRef.current = null;
    processedCallSignalIdsRef.current = [];
    pendingRemoteIceRef.current = [];
    attachLocalCallPreview(null);
    attachRemoteCallPreview(null);
    setLocalCallVideoReady(false);
    setRemoteCallVideoReady(false);
    setCallMuted(false);
    setCallVideoEnabled(false);
    setCallConnectionState("new");
  }, [attachLocalCallPreview, attachRemoteCallPreview, stopToneLoops]);

  const postCallAction = useCallback(
    async (conversationId: string, body: Record<string, unknown>) =>
      req<{ session: CallSession }>(`/api/messages/${conversationId}/call`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    [],
  );

  const fetchCurrentCall = useCallback(async () => {
    try {
      const payload = await req<{ session: CallSession | null }>("/api/calls/current");
      const nextSession = payload.session ?? null;
      const previousCallId = previousCallIdRef.current;

      if (!nextSession && previousCallId) {
        teardownCallConnection();
        setCallBusy(false);
        setCallStartingMode(null);
        setCallError(null);
      }

      if (nextSession && nextSession.id !== previousCallId) {
        processedCallSignalIdsRef.current = [];
        pendingRemoteIceRef.current = [];
        setCallError(null);
      }

      previousCallIdRef.current = nextSession?.id ?? null;
      setCurrentCall(nextSession);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Could not refresh call state.";

      if (message === "Unauthorized") {
        previousCallIdRef.current = null;
        setCurrentCall(null);
        setCallBusy(false);
        setCallStartingMode(null);
        setCallError(null);
        teardownCallConnection();
      }
    }
  }, [teardownCallConnection]);

  const ensureLocalCallStream = useCallback(
    async (mode: CallMode) => {
      const existing = localCallStreamRef.current;

      if (existing) {
        const hasVideo = existing.getVideoTracks().length > 0;

        if (mode === "voice" || hasVideo) {
          setLocalCallVideoReady(hasVideo);
          setCallVideoEnabled(hasVideo);
          setCallMuted(existing.getAudioTracks().every((track) => !track.enabled));
          attachLocalCallPreview(existing);
          return existing;
        }

        existing.getTracks().forEach((track) => track.stop());
        localCallStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          mode === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: "user",
              }
            : false,
      });

      localCallStreamRef.current = stream;
      attachLocalCallPreview(stream);
      const hasVideo = stream.getVideoTracks().length > 0;
      setLocalCallVideoReady(hasVideo);
      setCallVideoEnabled(hasVideo);
      setCallMuted(false);
      return stream;
    },
    [attachLocalCallPreview],
  );

  const ensureCallPeerConnection = useCallback(
    async (session: CallSession) => {
      if (callPeerRef.current && currentCallIdRef.current === session.id) {
        return callPeerRef.current;
      }

      if (callPeerRef.current && currentCallIdRef.current !== session.id) {
        teardownCallConnection();
      }

      const stream = await ensureLocalCallStream(session.mode);
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      currentCallIdRef.current = session.id;
      callPeerRef.current = peer;
      setCallConnectionState(peer.connectionState);

      peer.ontrack = (event) => {
        const incomingStream = event.streams[0];

        if (incomingStream) {
          remoteCallStreamRef.current = incomingStream;
        } else {
          if (!remoteCallStreamRef.current) {
            remoteCallStreamRef.current = new MediaStream();
          }

          remoteCallStreamRef.current.addTrack(event.track);
        }

        attachRemoteCallPreview(remoteCallStreamRef.current);
        setRemoteCallVideoReady(
          (remoteCallStreamRef.current?.getVideoTracks().length ?? 0) > 0,
        );
      };

      peer.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void postCallAction(session.conversationId, {
          action: "signal",
          callId: session.id,
          signalType: "ice",
          payload: event.candidate.toJSON(),
          toUserId: session.otherUser.id,
        })
          .then((payload) => setCurrentCall(payload.session))
          .catch(() => undefined);
      };

      peer.onconnectionstatechange = () => {
        setCallConnectionState(peer.connectionState);

        if (peer.connectionState === "failed") {
          setCallError("Call connection failed. Try again.");
        }
      };

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      return peer;
    },
    [attachRemoteCallPreview, ensureLocalCallStream, postCallAction, teardownCallConnection],
  );

  const flushPendingRemoteIce = useCallback(async () => {
    if (!callPeerRef.current?.remoteDescription || pendingRemoteIceRef.current.length === 0) {
      return;
    }

    const pending = [...pendingRemoteIceRef.current];
    pendingRemoteIceRef.current = [];

    for (const candidate of pending) {
      try {
        await callPeerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore invalid remote ICE candidates.
      }
    }
  }, []);

  const processCallSignal = useCallback(
    async (session: CallSession, signal: CallSignal) => {
      const myUserId =
        session.participants.find((participant) => participant.userId !== session.otherUser.id)
          ?.userId ?? null;

      if (!myUserId || signal.toUserId !== myUserId) {
        return;
      }

      if (processedCallSignalIdsRef.current.includes(signal.id)) {
        return;
      }

      try {
        if (signal.type === "offer") {
          if (!callPeerRef.current || currentCallIdRef.current !== session.id) {
            return;
          }

          if (!isRtcSessionDescriptionInit(signal.payload)) {
            processedCallSignalIdsRef.current = [
              ...processedCallSignalIdsRef.current,
              signal.id,
            ];
            return;
          }

          const peer = await ensureCallPeerConnection(session);
          await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
          await flushPendingRemoteIce();

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          const payload = await postCallAction(session.conversationId, {
            action: "signal",
            callId: session.id,
            signalType: "answer",
            payload: peer.localDescription
              ? {
                  type: peer.localDescription.type,
                  sdp: peer.localDescription.sdp ?? undefined,
                }
              : answer,
            toUserId: session.otherUser.id,
          });

          setCurrentCall(payload.session);
        } else if (signal.type === "answer") {
          if (
            !callPeerRef.current ||
            currentCallIdRef.current !== session.id ||
            !isRtcSessionDescriptionInit(signal.payload)
          ) {
            return;
          }

          await callPeerRef.current.setRemoteDescription(
            new RTCSessionDescription(signal.payload),
          );
          await flushPendingRemoteIce();
        } else if (signal.type === "ice") {
          if (
            !callPeerRef.current ||
            currentCallIdRef.current !== session.id ||
            !isRtcIceCandidateInit(signal.payload)
          ) {
            return;
          }

          if (callPeerRef.current.remoteDescription) {
            await callPeerRef.current.addIceCandidate(
              new RTCIceCandidate(signal.payload),
            );
          } else {
            pendingRemoteIceRef.current = [...pendingRemoteIceRef.current, signal.payload];
          }
        }

        processedCallSignalIdsRef.current = [...processedCallSignalIdsRef.current, signal.id];
      } catch (processingError) {
        setCallError(
          processingError instanceof Error
            ? processingError.message
            : "Could not process call signal.",
        );
      }
    },
    [ensureCallPeerConnection, flushPendingRemoteIce, postCallAction],
  );

  const startCall = useCallback(
    async (conversationId: string, mode: CallMode) => {
      if (!conversationId || currentCall) {
        return;
      }

      setCallStartingMode(mode);
      setCallBusy(true);
      setCallError(null);

      try {
        const payload = await postCallAction(conversationId, {
          action: "start",
          mode,
        });

        setCurrentCall(payload.session);

        const peer = await ensureCallPeerConnection(payload.session);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        const updated = await postCallAction(conversationId, {
          action: "signal",
          callId: payload.session.id,
          signalType: "offer",
          payload: peer.localDescription
            ? {
                type: peer.localDescription.type,
                sdp: peer.localDescription.sdp ?? undefined,
              }
            : offer,
          toUserId: payload.session.otherUser.id,
        });

        setCurrentCall(updated.session);
        previousCallIdRef.current = updated.session.id;
      } catch (callStartError) {
        teardownCallConnection();
        setCallError(
          callStartError instanceof Error
            ? callStartError.message
            : "Could not start the call.",
        );
      } finally {
        setCallStartingMode(null);
        setCallBusy(false);
      }
    },
    [currentCall, ensureCallPeerConnection, postCallAction, teardownCallConnection],
  );

  const answerCurrentCall = useCallback(async () => {
    if (!currentCall) {
      return;
    }

    setCallBusy(true);
    setCallError(null);

    try {
      const myUserId =
        currentCall.participants.find((participant) => participant.userId !== currentCall.otherUser.id)
          ?.userId ?? null;
      const payload = await postCallAction(currentCall.conversationId, {
        action: "accept",
        callId: currentCall.id,
      });

      setCurrentCall(payload.session);
      previousCallIdRef.current = payload.session.id;
      await ensureCallPeerConnection(payload.session);

      for (const signal of payload.session.signals.filter(
        (candidate) => candidate.toUserId === myUserId,
      )) {
        await processCallSignal(payload.session, signal);
      }
    } catch (answerError) {
      setCallError(
        answerError instanceof Error ? answerError.message : "Could not answer the call.",
      );
    } finally {
      setCallBusy(false);
    }
  }, [currentCall, ensureCallPeerConnection, postCallAction, processCallSignal]);

  const declineCurrentCall = useCallback(async () => {
    if (!currentCall) {
      return;
    }

    setCallBusy(true);
    setCallError(null);

    try {
      await postCallAction(currentCall.conversationId, {
        action: "decline",
        callId: currentCall.id,
      });
      setCurrentCall(null);
      previousCallIdRef.current = null;
      teardownCallConnection();
    } catch (declineError) {
      setCallError(
        declineError instanceof Error
          ? declineError.message
          : "Could not decline the call.",
      );
    } finally {
      setCallBusy(false);
    }
  }, [currentCall, postCallAction, teardownCallConnection]);

  const endCurrentCall = useCallback(async () => {
    if (!currentCall) {
      return;
    }

    setCallBusy(true);
    setCallError(null);

    try {
      await postCallAction(currentCall.conversationId, {
        action: "end",
        callId: currentCall.id,
      });
      setCurrentCall(null);
      previousCallIdRef.current = null;
      teardownCallConnection();
    } catch (endError) {
      setCallError(
        endError instanceof Error ? endError.message : "Could not end the call.",
      );
    } finally {
      setCallBusy(false);
    }
  }, [currentCall, postCallAction, teardownCallConnection]);

  const toggleCallMute = useCallback(async () => {
    if (!currentCall || !localCallStreamRef.current) {
      return;
    }

    const nextMuted = !callMuted;
    localCallStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setCallMuted(nextMuted);

    try {
      const payload = await postCallAction(currentCall.conversationId, {
        action: "media",
        callId: currentCall.id,
        audioEnabled: !nextMuted,
      });
      setCurrentCall(payload.session);
    } catch {
      // Ignore transient media sync errors.
    }
  }, [callMuted, currentCall, postCallAction]);

  const toggleCallVideo = useCallback(async () => {
    if (!currentCall || currentCall.mode !== "video" || !localCallStreamRef.current) {
      return;
    }

    const videoTrack = localCallStreamRef.current.getVideoTracks()[0];

    if (!videoTrack) {
      return;
    }

    const nextVideoEnabled = !callVideoEnabled;
    videoTrack.enabled = nextVideoEnabled;
    setCallVideoEnabled(nextVideoEnabled);
    setLocalCallVideoReady(nextVideoEnabled);

    try {
      const payload = await postCallAction(currentCall.conversationId, {
        action: "media",
        callId: currentCall.id,
        videoEnabled: nextVideoEnabled,
      });
      setCurrentCall(payload.session);
    } catch {
      // Ignore transient media sync errors.
    }
  }, [callVideoEnabled, currentCall, postCallAction]);

  const currentCallStatusLabel = useMemo(() => {
    if (!currentCall) {
      return "";
    }

    if (currentCall.status === "ringing") {
      return currentCall.isIncoming ? "Incoming call" : "Calling...";
    }

    if (currentCall.status === "connecting") {
      return "Connecting...";
    }

    if (currentCall.status === "active") {
      return callConnectionState === "connected"
        ? "Connected in HD"
        : "Connecting media...";
    }

    return currentCall.status;
  }, [callConnectionState, currentCall]);
  const liveDurationLabel = useMemo(() => {
    if (currentCall?.status !== "active" || !currentCall.answeredAt) {
      return null;
    }

    const startedAt = new Date(currentCall.answeredAt).getTime();

    if (Number.isNaN(startedAt)) {
      return null;
    }

    return formatLiveCallDuration(Math.max(0, callDurationTick - startedAt));
  }, [callDurationTick, currentCall]);
  const canMinimize =
    Boolean(currentCall) &&
    !(currentCall?.isIncoming && currentCall.status === "ringing");

  useEffect(() => {
    if (!currentCall) {
      setCallMinimized(false);
      return;
    }

    if (currentCall.isIncoming && currentCall.status === "ringing") {
      setCallMinimized(false);
    }
  }, [currentCall]);

  useEffect(() => {
    if (currentCall?.status !== "active" || !currentCall.answeredAt) {
      return;
    }

    setCallDurationTick(Date.now());
    const interval = window.setInterval(() => {
      setCallDurationTick(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentCall?.answeredAt, currentCall?.status]);

  useEffect(() => {
    const unlockAudio = () => {
      void ensureAudioContext();
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, [ensureAudioContext]);

  useEffect(() => {
    void fetchCurrentCall();
    const interval = window.setInterval(() => {
      void fetchCurrentCall();
    }, 1800);

    return () => window.clearInterval(interval);
  }, [fetchCurrentCall]);

  useEffect(() => {
    if (!currentCall) {
      return;
    }

    if (currentCall.id !== currentCallIdRef.current) {
      processedCallSignalIdsRef.current = [];
      pendingRemoteIceRef.current = [];
    }

    const myUserId =
      currentCall.participants.find((participant) => participant.userId !== currentCall.otherUser.id)
        ?.userId ?? null;
    const me = currentCall.participants.find((participant) => participant.userId === myUserId);

    if (me) {
      setCallMuted(!me.audioEnabled);
      setCallVideoEnabled(currentCall.mode === "video" ? me.videoEnabled : false);
    }

    currentCall.signals
      .filter((signal) => signal.toUserId === myUserId)
      .forEach((signal) => {
        void processCallSignal(currentCall, signal);
      });
  }, [currentCall, processCallSignal]);

  useEffect(() => {
    attachLocalCallPreview(localCallStreamRef.current);
  }, [attachLocalCallPreview, callMinimized, currentCall?.id, localCallVideoReady]);

  useEffect(() => {
    attachRemoteCallPreview(remoteCallStreamRef.current);
  }, [attachRemoteCallPreview, callMinimized, currentCall?.id, remoteCallVideoReady]);

  useEffect(() => {
    if (!currentCall || currentCall.status !== "ringing") {
      stopToneLoops();
      return;
    }

    if (currentCall.isIncoming) {
      startIncomingRingtone();
      return;
    }

    startOutgoingRingback();
  }, [currentCall, startIncomingRingtone, startOutgoingRingback, stopToneLoops]);

  useEffect(() => {
    if (currentCall?.status === "active" || currentCall?.status === "connecting") {
      stopToneLoops();
    }
  }, [currentCall?.status, stopToneLoops]);

  useEffect(() => {
    const previous = publishedCallStateRef.current;
    const nextId = currentCall?.id ?? null;
    const nextStatus = currentCall?.status ?? null;
    const nextConversationId = currentCall?.conversationId ?? null;
    const changedConversationId =
      previous.id !== nextId || previous.status !== nextStatus
        ? nextConversationId ?? previous.conversationId
        : null;

    const detail: MotionCallStateDetail = {
      session: currentCall,
      statusLabel: currentCallStatusLabel,
      busy: Boolean(callStartingMode) || callBusy || Boolean(currentCall),
      error: callError,
      conversationId: changedConversationId,
    };

    window.dispatchEvent(
      new CustomEvent<MotionCallStateDetail>(MOTION_CALL_STATE_EVENT, { detail }),
    );

    publishedCallStateRef.current = {
      id: nextId,
      status: nextStatus,
      conversationId: nextConversationId ?? previous.conversationId ?? null,
    };
  }, [callBusy, callError, callStartingMode, currentCall, currentCallStatusLabel]);

  useEffect(() => {
    const handleStartCall = (event: Event) => {
      const detail = (event as CustomEvent<MotionStartCallDetail>).detail;

      if (
        !detail ||
        typeof detail.conversationId !== "string" ||
        (detail.mode !== "voice" && detail.mode !== "video")
      ) {
        return;
      }

      void startCall(detail.conversationId, detail.mode);
    };

    const handleSyncRequest = () => {
      const detail: MotionCallStateDetail = {
        session: currentCall,
        statusLabel: currentCallStatusLabel,
        busy: Boolean(callStartingMode) || callBusy || Boolean(currentCall),
        error: callError,
      };

      window.dispatchEvent(
        new CustomEvent<MotionCallStateDetail>(MOTION_CALL_STATE_EVENT, { detail }),
      );
    };

    window.addEventListener(MOTION_START_CALL_EVENT, handleStartCall as EventListener);
    window.addEventListener(
      MOTION_CALL_SYNC_REQUEST_EVENT,
      handleSyncRequest as EventListener,
    );

    return () => {
      window.removeEventListener(MOTION_START_CALL_EVENT, handleStartCall as EventListener);
      window.removeEventListener(
        MOTION_CALL_SYNC_REQUEST_EVENT,
        handleSyncRequest as EventListener,
      );
    };
  }, [callBusy, callError, callStartingMode, currentCall, currentCallStatusLabel, startCall]);

  useEffect(() => {
    return () => {
      stopToneLoops();
      teardownCallConnection();

      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, [stopToneLoops, teardownCallConnection]);

  return (
    <ChatCallOverlay
      session={currentCall}
      localVideoRef={localCallVideoRef}
      remoteVideoRef={remoteCallVideoRef}
      remoteVideoReady={remoteCallVideoReady}
      localVideoReady={localCallVideoReady}
      muted={callMuted}
      videoEnabled={callVideoEnabled}
      busy={Boolean(callStartingMode) || callBusy}
      callError={callError}
      statusLabel={currentCallStatusLabel}
      liveDurationLabel={liveDurationLabel}
      minimized={callMinimized}
      canMinimize={canMinimize}
      onAnswer={() => {
        void answerCurrentCall();
      }}
      onDecline={() => {
        void declineCurrentCall();
      }}
      onEnd={() => {
        void endCurrentCall();
      }}
      onToggleMute={() => {
        void toggleCallMute();
      }}
      onToggleVideo={() => {
        void toggleCallVideo();
      }}
      onMinimize={() => {
        setCallMinimized(true);
      }}
      onRestore={() => {
        setCallMinimized(false);
      }}
    />
  );
}
