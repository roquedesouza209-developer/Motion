"use client";

import type { FormEvent, ReactNode, RefObject } from "react";

import MoveComposerFields from "@/components/home/move-composer-fields";

type MoveKind = "Photo" | "Reel";

type MoveComposerModalProps = {
  open: boolean;
  publishing: boolean;
  storyCaption: string;
  storyKind: MoveKind;
  storyFilesCount: number;
  storyCaptionRef: RefObject<HTMLTextAreaElement | null>;
  storyInputRef: RefObject<HTMLInputElement | null>;
  userAvatarGradient: string;
  error: string | null;
  storyPollQuestion: string;
  storyPollOptionA: string;
  storyPollOptionB: string;
  storyQuestionPrompt: string;
  storyEmojiChoices: string[];
  storyEmojiOptions: readonly string[];
  storyMusicPicker: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStoryCaptionChange: (value: string) => void;
  onStoryKindChange: (kind: MoveKind) => void;
  onStoryFilesSelected: (files: FileList | null) => void;
  onStoryPollQuestionChange: (value: string) => void;
  onStoryPollOptionAChange: (value: string) => void;
  onStoryPollOptionBChange: (value: string) => void;
  onStoryQuestionPromptChange: (value: string) => void;
  onToggleStoryEmojiChoice: (emoji: string) => void;
};

export default function MoveComposerModal({
  open,
  publishing,
  storyCaption,
  storyKind,
  storyFilesCount,
  storyCaptionRef,
  storyInputRef,
  userAvatarGradient,
  error,
  storyPollQuestion,
  storyPollOptionA,
  storyPollOptionB,
  storyQuestionPrompt,
  storyEmojiChoices,
  storyEmojiOptions,
  storyMusicPicker,
  onClose,
  onSubmit,
  onStoryCaptionChange,
  onStoryKindChange,
  onStoryFilesSelected,
  onStoryPollQuestionChange,
  onStoryPollOptionAChange,
  onStoryPollOptionBChange,
  onStoryQuestionPromptChange,
  onToggleStoryEmojiChoice,
}: MoveComposerModalProps) {
  if (!open) {
    return null;
  }

  const previewText =
    storyFilesCount > 0
      ? `${storyFilesCount} file${storyFilesCount > 1 ? "s" : ""} selected`
      : storyCaption.trim() || "Upload a photo or reel for your move.";

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
        className="motion-surface w-full max-w-lg max-h-[85vh] overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create move"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your Move
            </h2>
            <p className="mt-1 text-sm text-slate-500">This is a dedicated move composer.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
            aria-label="Close move composer"
            disabled={publishing}
          >
            x
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <textarea
            ref={storyCaptionRef}
            value={storyCaption}
            onChange={(event) => onStoryCaptionChange(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
            placeholder="Add a move caption (optional)..."
          />

          <MoveComposerFields
            storyKind={storyKind}
            filesCount={storyFilesCount}
            inputRef={storyInputRef}
            previewBackground={userAvatarGradient}
            previewText={previewText}
            pollQuestion={storyPollQuestion}
            pollOptionA={storyPollOptionA}
            pollOptionB={storyPollOptionB}
            questionPrompt={storyQuestionPrompt}
            selectedEmojis={storyEmojiChoices}
            emojiOptions={storyEmojiOptions}
            musicPicker={storyMusicPicker}
            onStoryKindChange={onStoryKindChange}
            onFilesSelected={onStoryFilesSelected}
            onPollQuestionChange={onStoryPollQuestionChange}
            onPollOptionAChange={onStoryPollOptionAChange}
            onPollOptionBChange={onStoryPollOptionBChange}
            onQuestionPromptChange={onStoryQuestionPromptChange}
            onToggleEmojiChoice={onToggleStoryEmojiChoice}
          />

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
              {publishing ? "Publishing..." : "Move"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
