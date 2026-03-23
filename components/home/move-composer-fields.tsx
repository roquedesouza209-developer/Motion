"use client";

import type { ReactNode, RefObject } from "react";

type MoveKind = "Photo" | "Reel";

type MoveComposerFieldsProps = {
  storyKind: MoveKind;
  filesCount: number;
  inputRef: RefObject<HTMLInputElement | null>;
  previewBackground: string;
  previewText: string;
  pollQuestion: string;
  pollOptionA: string;
  pollOptionB: string;
  questionPrompt: string;
  selectedEmojis: string[];
  emojiOptions: readonly string[];
  musicPicker: ReactNode;
  onStoryKindChange: (kind: MoveKind) => void;
  onFilesSelected: (files: FileList | null) => void;
  onPollQuestionChange: (value: string) => void;
  onPollOptionAChange: (value: string) => void;
  onPollOptionBChange: (value: string) => void;
  onQuestionPromptChange: (value: string) => void;
  onToggleEmojiChoice: (emoji: string) => void;
};

export default function MoveComposerFields({
  storyKind,
  filesCount,
  inputRef,
  previewBackground,
  previewText,
  pollQuestion,
  pollOptionA,
  pollOptionB,
  questionPrompt,
  selectedEmojis,
  emojiOptions,
  musicPicker,
  onStoryKindChange,
  onFilesSelected,
  onPollQuestionChange,
  onPollOptionAChange,
  onPollOptionBChange,
  onQuestionPromptChange,
  onToggleEmojiChoice,
}: MoveComposerFieldsProps) {
  return (
    <>
      <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {(["Photo", "Reel"] as MoveKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onStoryKindChange(kind)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                storyKind === kind
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                  : "border-[var(--line)] bg-white text-slate-700"
              }`}
            >
              {kind === "Photo" ? "Photo Move" : "Reel Move"}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Upload {storyKind === "Photo" ? "Photo" : "Video"}
            </p>
            <p className="text-xs text-slate-500">
              {filesCount > 0 ? `${filesCount} selected` : "Choose from your device"}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={storyKind === "Photo" ? "image/*" : "video/*"}
            multiple
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.target.value = "";
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-white text-sm font-semibold text-slate-700"
            aria-label="Add more media"
            title="Add more"
          >
            +
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Moves are temporary. They disappear after 24 hours.
      </p>

      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-3">
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-900">Story Stickers</p>
          <p className="text-xs text-slate-500">Add polls, questions, reactions, or music.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Poll</label>
            <input
              value={pollQuestion}
              onChange={(event) => onPollQuestionChange(event.target.value)}
              placeholder="Poll question"
              className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs"
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                value={pollOptionA}
                onChange={(event) => onPollOptionAChange(event.target.value)}
                placeholder="Option 1"
                className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs"
              />
              <input
                value={pollOptionB}
                onChange={(event) => onPollOptionBChange(event.target.value)}
                placeholder="Option 2"
                className="h-9 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Question</label>
            <input
              value={questionPrompt}
              onChange={(event) => onQuestionPromptChange(event.target.value)}
              placeholder="Ask a question"
              className="mt-1 h-9 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Emoji reactions</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {emojiOptions.map((emoji) => {
                const selected = selectedEmojis.includes(emoji);

                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleEmojiChoice(emoji)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      selected
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--line)] bg-white text-slate-700"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {musicPicker}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">Move Preview</p>
        <p className="mt-1 text-xs text-slate-500">
          Quick, temporary, and separate from the main feed.
        </p>
        <div
          className="mt-3 rounded-2xl px-4 py-5 text-sm font-medium text-white"
          style={{ background: previewBackground }}
        >
          {previewText}
        </div>
      </div>
    </>
  );
}
