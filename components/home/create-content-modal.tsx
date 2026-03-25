"use client";

import type { FormEvent, ReactNode, RefObject } from "react";

import type { InterestKey } from "@/lib/interests";

import MoveComposerFields from "@/components/home/move-composer-fields";

type ComposerMode = "post" | "reel" | "story" | "live";
type MoveKind = "Photo" | "Reel";

type InterestOption = {
  id: InterestKey;
  label: string;
};

type ComposerHotspot = {
  id: string;
  title: string;
  detail: string;
  yaw: number;
  pitch: number;
};

type CreateContentModalProps = {
  open: boolean;
  publishing: boolean;
  composerMode: ComposerMode;
  composerCaption: string;
  liveTitle: string;
  coAuthorHandle: string;
  composerVisibleAt: string;
  composerInterests: InterestKey[];
  composerImmersiveVideo: boolean;
  composerHotspots: ComposerHotspot[];
  interestOptions: readonly InterestOption[];
  composerFilesCount: number;
  composerCaptionRef: RefObject<HTMLTextAreaElement | null>;
  composerInputRef: RefObject<HTMLInputElement | null>;
  capsuleMinValue: string;
  error: string | null;
  userAvatarGradient: string;
  storyKind: MoveKind;
  storyPollQuestion: string;
  storyPollOptionA: string;
  storyPollOptionB: string;
  storyQuestionPrompt: string;
  storyEmojiChoices: string[];
  storyEmojiOptions: readonly string[];
  storyMusicPicker: ReactNode;
  formatCapsuleDate: (value: string) => string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModeChange: (mode: ComposerMode) => void;
  onCaptionChange: (value: string) => void;
  onLiveTitleChange: (value: string) => void;
  onCoAuthorHandleChange: (value: string) => void;
  onVisibleAtChange: (value: string) => void;
  onToggleInterest: (interestId: InterestKey) => void;
  onComposerImmersiveVideoChange: (next: boolean) => void;
  onAddComposerHotspot: () => void;
  onUpdateComposerHotspot: (
    hotspotId: string,
    patch: Partial<ComposerHotspot>,
  ) => void;
  onRemoveComposerHotspot: (hotspotId: string) => void;
  onStoryKindChange: (kind: MoveKind) => void;
  onComposerFilesSelected: (files: FileList | null) => void;
  onStoryPollQuestionChange: (value: string) => void;
  onStoryPollOptionAChange: (value: string) => void;
  onStoryPollOptionBChange: (value: string) => void;
  onStoryQuestionPromptChange: (value: string) => void;
  onToggleStoryEmojiChoice: (emoji: string) => void;
};

export default function CreateContentModal({
  open,
  publishing,
  composerMode,
  composerCaption,
  liveTitle,
  coAuthorHandle,
  composerVisibleAt,
  composerInterests,
  composerImmersiveVideo,
  composerHotspots,
  interestOptions,
  composerFilesCount,
  composerCaptionRef,
  composerInputRef,
  capsuleMinValue,
  error,
  userAvatarGradient,
  storyKind,
  storyPollQuestion,
  storyPollOptionA,
  storyPollOptionB,
  storyQuestionPrompt,
  storyEmojiChoices,
  storyEmojiOptions,
  storyMusicPicker,
  formatCapsuleDate,
  onClose,
  onSubmit,
  onModeChange,
  onCaptionChange,
  onLiveTitleChange,
  onCoAuthorHandleChange,
  onVisibleAtChange,
  onToggleInterest,
  onComposerImmersiveVideoChange,
  onAddComposerHotspot,
  onUpdateComposerHotspot,
  onRemoveComposerHotspot,
  onStoryKindChange,
  onComposerFilesSelected,
  onStoryPollQuestionChange,
  onStoryPollOptionAChange,
  onStoryPollOptionBChange,
  onStoryQuestionPromptChange,
  onToggleStoryEmojiChoice,
}: CreateContentModalProps) {
  if (!open) {
    return null;
  }

  const movePreviewText =
    composerFilesCount > 0
      ? `${composerFilesCount} file${composerFilesCount > 1 ? "s" : ""} selected`
      : composerCaption.trim() || "Upload a photo or reel for your move.";

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
      onClick={() => {
        if (!publishing) {
          onClose();
        }
      }}
    >
      <section
        className="motion-surface w-full max-w-xl p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Create
            </h2>
            <p className="mt-1 text-sm text-slate-500">Choose what you want to publish.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
            aria-label="Close composer"
            disabled={publishing}
          >
            x
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { id: "post" as const, label: "Post" },
              { id: "reel" as const, label: "Reel" },
              { id: "story" as const, label: "Move" },
              { id: "live" as const, label: "Live" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onModeChange(option.id)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  composerMode === option.id
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-[var(--line)] bg-white text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {composerMode === "live" ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <label className="block text-sm font-semibold text-slate-900">
                Live title (optional)
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Viewers will see this title while you&apos;re live.
              </p>
              <input
                value={liveTitle}
                onChange={(event) => onLiveTitleChange(event.target.value)}
                placeholder="Behind the scenes with Motion"
                className="mt-3 h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-slate-700"
              />
            </div>
          ) : (
            <textarea
              ref={composerCaptionRef}
              value={composerCaption}
              onChange={(event) => onCaptionChange(event.target.value)}
              className="min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
              placeholder={
                composerMode === "story"
                  ? "Add a move caption (optional)..."
                  : "What&apos;s on your mind?"
              }
            />
          )}

          {(composerMode === "post" || composerMode === "reel") && (
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <label className="block text-sm font-semibold text-slate-900">
                Co-author (optional)
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Invite another creator to co-post. The post appears on both profiles.
              </p>
              <input
                value={coAuthorHandle}
                onChange={(event) => onCoAuthorHandleChange(event.target.value)}
                placeholder="@handle"
                className="mt-3 h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-slate-700 transition focus:border-[var(--brand)] focus:outline-none"
              />
            </div>
          )}

          {(composerMode === "post" || composerMode === "reel") && (
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Post interests</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tag the vibe so Motion can place this in the right feed.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  {composerInterests.length} selected
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {interestOptions.map((interest) => {
                  const active = composerInterests.includes(interest.id);

                  return (
                    <button
                      key={`composer-interest-${interest.id}`}
                      type="button"
                      onClick={() => onToggleInterest(interest.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                          : "border-[var(--line)] bg-white text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)]"
                      }`}
                      aria-pressed={active}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {composerMode === "story" ? (
            <MoveComposerFields
              storyKind={storyKind}
              filesCount={composerFilesCount}
              inputRef={composerInputRef}
              previewBackground={userAvatarGradient}
              previewText={movePreviewText}
              pollQuestion={storyPollQuestion}
              pollOptionA={storyPollOptionA}
              pollOptionB={storyPollOptionB}
              questionPrompt={storyQuestionPrompt}
              selectedEmojis={storyEmojiChoices}
              emojiOptions={storyEmojiOptions}
              musicPicker={storyMusicPicker}
              onStoryKindChange={onStoryKindChange}
              onFilesSelected={onComposerFilesSelected}
              onPollQuestionChange={onStoryPollQuestionChange}
              onPollOptionAChange={onStoryPollOptionAChange}
              onPollOptionBChange={onStoryPollOptionBChange}
              onQuestionPromptChange={onStoryQuestionPromptChange}
              onToggleEmojiChoice={onToggleStoryEmojiChoice}
            />
          ) : composerMode === "live" ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Start a live broadcast
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      We&apos;ll open your live room right away so viewers can join and comment in real time.
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-500 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(244,63,94,0.8)]">
                    LIVE
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">What viewers get</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)] px-3 py-4">
                    <p className="text-xs font-semibold text-slate-900">Join instantly</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Anyone on Motion can enter the room while you&apos;re live.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)] px-3 py-4">
                    <p className="text-xs font-semibold text-slate-900">Live comments</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Reactions stay active with a scrolling comment lane.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)] px-3 py-4">
                    <p className="text-xs font-semibold text-slate-900">Viewer count</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Motion keeps the room count visible the whole time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-900">Time Capsule</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Leave blank to publish now, or choose when this post becomes visible.
                  </span>
                  <input
                    type="datetime-local"
                    value={composerVisibleAt}
                    min={capsuleMinValue}
                    onChange={(event) => onVisibleAtChange(event.target.value)}
                    className="mt-3 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-slate-700"
                  />
                </label>
                {composerVisibleAt ? (
                  <p className="mt-3 text-xs font-medium text-[var(--brand)]">
                    This time capsule opens {formatCapsuleDate(composerVisibleAt)}.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Add {composerMode === "post" ? "Media" : "Reel"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {composerFilesCount > 0
                        ? `${composerFilesCount} selected`
                        : composerMode === "post"
                          ? "Choose photos or videos to upload"
                          : "Choose a file to upload"}
                    </p>
                  </div>

                  <input
                    ref={composerInputRef}
                    type="file"
                    accept={composerMode === "post" ? "image/*,video/*" : "video/*"}
                    multiple={composerMode === "post"}
                    onChange={(event) => {
                      onComposerFilesSelected(event.target.files);
                      event.target.value = "";
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => composerInputRef.current?.click()}
                    className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-white text-sm font-semibold text-slate-700"
                    aria-label="Add more media"
                    title="Add more"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">360 immersive video</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Turn uploaded videos into a spatial viewer so people can drag to look around.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onComposerImmersiveVideoChange(!composerImmersiveVideo)}
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
                      composerImmersiveVideo ? "bg-[var(--brand)]" : "bg-slate-200"
                    }`}
                    aria-pressed={composerImmersiveVideo}
                    aria-label="Toggle immersive 360 video"
                    title="Toggle immersive 360 video"
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        composerImmersiveVideo ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {composerImmersiveVideo ? (
                <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Story hotspots</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add tappable points so viewers can explore key moments inside the 360 scene.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onAddComposerHotspot}
                      className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                      disabled={composerHotspots.length >= 4}
                    >
                      Add hotspot
                    </button>
                  </div>

                  {composerHotspots.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {composerHotspots.map((hotspot, index) => (
                        <div
                          key={hotspot.id}
                          className="rounded-2xl border border-[var(--line)] bg-[var(--brand-soft)] p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Hotspot {index + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => onRemoveComposerHotspot(hotspot.id)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-rose-600"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 grid gap-3">
                            <input
                              value={hotspot.title}
                              onChange={(event) =>
                                onUpdateComposerHotspot(hotspot.id, {
                                  title: event.target.value,
                                })
                              }
                              placeholder="Hotspot title"
                              className="h-10 rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-slate-700"
                            />
                            <textarea
                              value={hotspot.detail}
                              onChange={(event) =>
                                onUpdateComposerHotspot(hotspot.id, {
                                  detail: event.target.value,
                                })
                              }
                              placeholder="Short story note or detail"
                              className="min-h-20 rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-slate-700"
                            />

                            <label className="block">
                              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                <span>Heading</span>
                                <span>{hotspot.yaw}°</span>
                              </div>
                              <input
                                type="range"
                                min={-180}
                                max={180}
                                step={5}
                                value={hotspot.yaw}
                                onChange={(event) =>
                                  onUpdateComposerHotspot(hotspot.id, {
                                    yaw: Number(event.target.value),
                                  })
                                }
                                className="w-full accent-[var(--brand)]"
                              />
                            </label>

                            <label className="block">
                              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                <span>Elevation</span>
                                <span>{hotspot.pitch}°</span>
                              </div>
                              <input
                                type="range"
                                min={-45}
                                max={45}
                                step={5}
                                value={hotspot.pitch}
                                onChange={(event) =>
                                  onUpdateComposerHotspot(hotspot.id, {
                                    pitch: Number(event.target.value),
                                  })
                                }
                                className="w-full accent-[var(--brand)]"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-3 py-3 text-xs text-slate-500">
                      No hotspots yet. Add one to mark a person, place, or moment in the scene.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
              disabled={publishing}
            >
              Cancel
            </button>
            <button
              disabled={publishing}
              className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
            >
              {publishing
                ? "Publishing..."
                : composerMode === "live"
                  ? "Go Live"
                  : composerMode === "story"
                    ? "Move"
                    : composerMode === "reel"
                      ? "Reel"
                      : "Post"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
