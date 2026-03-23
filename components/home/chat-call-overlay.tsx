"use client";

import type { ReactNode, RefObject } from "react";

import UserAvatar from "@/components/user-avatar";

type CallMode = "voice" | "video";
type CallStatus = "ringing" | "connecting" | "active" | "declined" | "ended" | "missed";

type CallParticipant = {
  userId: string;
  name: string;
  handle: string;
  avatarGradient: string;
  avatarUrl?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  joined: boolean;
};

type CallSession = {
  id: string;
  conversationId: string;
  mode: CallMode;
  status: CallStatus;
  isInitiator: boolean;
  isIncoming: boolean;
  otherUser: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  };
  participants: CallParticipant[];
};

type ChatCallOverlayProps = {
  session: CallSession | null;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoReady: boolean;
  localVideoReady: boolean;
  muted: boolean;
  videoEnabled: boolean;
  busy: boolean;
  callError: string | null;
  statusLabel: string;
  liveDurationLabel?: string | null;
  minimized?: boolean;
  canMinimize?: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onMinimize?: () => void;
  onRestore?: () => void;
};

function CallControl({
  label,
  onClick,
  variant = "default",
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "accept" | "active";
  disabled?: boolean;
  children: ReactNode;
}) {
  const tone =
    variant === "danger"
      ? "bg-rose-500 text-white shadow-[0_18px_40px_-20px_rgba(244,63,94,0.9)]"
      : variant === "accept"
        ? "bg-emerald-500 text-white shadow-[0_18px_40px_-20px_rgba(16,185,129,0.9)]"
        : variant === "active"
          ? "border-white/30 bg-white/15 text-white"
          : "border-white/20 bg-white/10 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-24 flex-col items-center gap-2 rounded-[28px] border px-4 py-3 text-xs font-semibold backdrop-blur-xl transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 ${tone}`}
      aria-label={label}
      title={label}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/20">
        {children}
      </span>
      <span>{label}</span>
    </button>
  );
}

function MiniControl({
  label,
  onClick,
  variant = "default",
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "active";
  disabled?: boolean;
  children: ReactNode;
}) {
  const tone =
    variant === "danger"
      ? "bg-rose-500 text-white shadow-[0_18px_40px_-20px_rgba(244,63,94,0.75)]"
      : variant === "active"
        ? "border-white/30 bg-white/15 text-white"
        : "border-white/20 bg-white/8 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`grid h-11 w-11 place-items-center rounded-2xl border transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 ${tone}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function ChatCallOverlay({
  session,
  localVideoRef,
  remoteVideoRef,
  remoteVideoReady,
  localVideoReady,
  muted,
  videoEnabled,
  busy,
  callError,
  statusLabel,
  liveDurationLabel,
  minimized = false,
  canMinimize = false,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onMinimize,
  onRestore,
}: ChatCallOverlayProps) {
  if (!session) {
    return null;
  }

  const remoteParticipant =
    session.participants.find((participant) => participant.userId === session.otherUser.id) ??
    session.participants[0];
  const showIncomingActions = session.isIncoming && session.status === "ringing";
  const showVideoStage = session.mode === "video";
  const showMinimizedBar = minimized && !showIncomingActions;

  if (showMinimizedBar) {
    return (
      <>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[118]">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="pointer-events-none h-0 w-0 opacity-0"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="pointer-events-none h-0 w-0 opacity-0"
          />
        </div>
        <div className="fixed bottom-5 right-5 z-[120] w-[min(24rem,calc(100vw-1.5rem))] rounded-[28px] border border-white/12 bg-[#091321]/92 p-4 text-white shadow-[0_30px_80px_-32px_rgba(2,6,23,0.95)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={session.otherUser.name}
              avatarGradient={session.otherUser.avatarGradient}
              avatarUrl={session.otherUser.avatarUrl}
              className="h-14 w-14"
              textClassName="text-lg font-semibold text-white"
              sizes="56px"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-semibold text-white">
                  {session.otherUser.name}
                </p>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Live
                </span>
              </div>
              <p className="mt-1 text-xs text-white/70">{statusLabel}</p>
              {liveDurationLabel ? (
                <p className="mt-1 text-[11px] font-semibold text-cyan-100">
                  {liveDurationLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onRestore}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/6 text-white transition hover:scale-[1.03]"
              aria-label="Restore call"
              title="Restore call"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 14 14 6" />
                <path d="M8 6h6v6" />
              </svg>
            </button>
          </div>

          {callError ? (
            <p className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">
              {callError}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-2">
            <MiniControl
              label={muted ? "Unmute" : "Mute"}
              onClick={onToggleMute}
              variant={muted ? "active" : "default"}
              disabled={busy}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {muted ? (
                  <>
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 11.8 5" />
                    <path d="M19 10a7 7 0 0 1-2.2 5" />
                    <path d="M12 19v2" />
                    <path d="M4 4l16 16" />
                  </>
                ) : (
                  <>
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <path d="M12 17v4" />
                  </>
                )}
              </svg>
            </MiniControl>

            {showVideoStage ? (
              <MiniControl
                label={videoEnabled ? "Video on" : "Video off"}
                onClick={onToggleVideo}
                variant={videoEnabled ? "default" : "active"}
                disabled={busy}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {videoEnabled ? (
                    <>
                      <rect x="3" y="7" width="13" height="10" rx="2" />
                      <path d="m16 10 5-3v10l-5-3" />
                    </>
                  ) : (
                    <>
                      <rect x="3" y="7" width="13" height="10" rx="2" />
                      <path d="m16 10 5-3v10l-5-3" />
                      <path d="M4 4 20 20" />
                    </>
                  )}
                </svg>
              </MiniControl>
            ) : null}

            <MiniControl
              label="End"
              onClick={onEnd}
              variant="danger"
              disabled={busy}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 15.5c3.4-3 12.6-3 16 0" />
                <path d="M8 13.5 6.5 18" />
                <path d="m16 13.5 1.5 4.5" />
              </svg>
            </MiniControl>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#070b14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_rgba(7,11,20,0.94),_rgba(3,7,18,1))]" />

      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={
            showVideoStage && remoteVideoReady
              ? "h-full w-full object-cover"
              : "pointer-events-none h-0 w-0 opacity-0"
          }
        />
        {!(showVideoStage && remoteVideoReady) ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="relative flex h-[22rem] w-[22rem] items-center justify-center rounded-full bg-white/5">
              <div className="absolute inset-0 animate-pulse rounded-full border border-white/10" />
              <div className="absolute inset-8 rounded-full border border-cyan-300/20" />
              <UserAvatar
                name={session.otherUser.name}
                avatarGradient={session.otherUser.avatarGradient}
                avatarUrl={session.otherUser.avatarUrl}
                className="h-36 w-36 shadow-[0_30px_70px_-25px_rgba(15,23,42,0.9)]"
                textClassName="text-4xl font-semibold text-white"
                sizes="144px"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/55">
              {session.mode === "video" ? "Video Call" : "Voice Call"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">
              {session.otherUser.name}
            </h2>
            <p className="mt-2 text-sm text-white/70">{statusLabel}</p>
            {callError ? (
              <p className="mt-3 inline-flex rounded-full border border-rose-300/35 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">
                {callError}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {canMinimize ? (
              <button
                type="button"
                onClick={onMinimize}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/6 text-white/80 transition hover:scale-[1.03] hover:text-white"
                aria-label="Minimize call"
                title="Minimize call"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10h12" />
                </svg>
              </button>
            ) : null}
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-xl">
              {remoteParticipant?.joined ? "Connected" : "Ringing"}
            </div>
          </div>
        </div>

        <div className="pointer-events-none flex flex-1 items-end justify-between">
          <div className="max-w-sm rounded-[28px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 backdrop-blur-xl">
            {remoteParticipant?.audioEnabled === false ? "Mic off" : "Mic on"}
            {" | "}
            {showVideoStage
              ? remoteParticipant?.videoEnabled === false
                ? "Camera off"
                : remoteVideoReady
                  ? "HD video connected"
                  : "Waiting for video"
              : "Voice only"}
          </div>

          {showVideoStage ? (
            <div className="pointer-events-auto relative h-40 w-28 overflow-hidden rounded-[28px] border border-white/15 bg-black/30 shadow-[0_25px_70px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:h-52 sm:w-36">
              {localVideoReady && videoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs font-semibold text-white/60">
                  Camera off
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end justify-center gap-3">
          {showIncomingActions ? (
            <>
              <CallControl
                label="Decline"
                onClick={onDecline}
                variant="danger"
                disabled={busy}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 15.5c3.4-3 12.6-3 16 0" />
                  <path d="M8 13.5 6.5 18" />
                  <path d="m16 13.5 1.5 4.5" />
                </svg>
              </CallControl>
              <CallControl
                label="Accept"
                onClick={onAnswer}
                variant="accept"
                disabled={busy}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 15.5c3.4-3 12.6-3 16 0" />
                  <path d="M8 13.5 6.5 18" />
                  <path d="m16 13.5 1.5 4.5" />
                </svg>
              </CallControl>
            </>
          ) : (
            <>
              <CallControl
                label={muted ? "Unmute" : "Mute"}
                onClick={onToggleMute}
                variant={muted ? "active" : "default"}
                disabled={busy}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {muted ? (
                    <>
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 10a7 7 0 0 0 11.8 5" />
                      <path d="M19 10a7 7 0 0 1-2.2 5" />
                      <path d="M12 19v2" />
                      <path d="M4 4l16 16" />
                    </>
                  ) : (
                    <>
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0" />
                      <path d="M12 17v4" />
                    </>
                  )}
                </svg>
              </CallControl>

              {showVideoStage ? (
                <CallControl
                  label={videoEnabled ? "Video on" : "Video off"}
                  onClick={onToggleVideo}
                  variant={videoEnabled ? "default" : "active"}
                  disabled={busy}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {videoEnabled ? (
                      <>
                        <rect x="3" y="7" width="13" height="10" rx="2" />
                        <path d="m16 10 5-3v10l-5-3" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="7" width="13" height="10" rx="2" />
                        <path d="m16 10 5-3v10l-5-3" />
                        <path d="M4 4 20 20" />
                      </>
                    )}
                  </svg>
                </CallControl>
              ) : null}

              <CallControl
                label="End"
                onClick={onEnd}
                variant="danger"
                disabled={busy}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 15.5c3.4-3 12.6-3 16 0" />
                  <path d="M8 13.5 6.5 18" />
                  <path d="m16 13.5 1.5 4.5" />
                </svg>
              </CallControl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

