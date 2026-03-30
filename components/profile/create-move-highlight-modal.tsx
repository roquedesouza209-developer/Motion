"use client";

import Image from "next/image";

import { PROFILE_ACCENT_OPTIONS } from "@/lib/profile-styles";
import type { ProfileAccent } from "@/lib/server/types";

type HighlightCandidate = {
  id: string;
  caption: string;
  gradient: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  createdAt: string;
};

type CreateMoveHighlightModalProps = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  title: string;
  accent: ProfileAccent;
  candidates: HighlightCandidate[];
  selectedIds: string[];
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangeAccent: (value: ProfileAccent) => void;
  onToggleCandidate: (storyId: string) => void;
  onSave: () => void;
};

export default function CreateMoveHighlightModal({
  open,
  loading,
  saving,
  error,
  title,
  accent,
  candidates,
  selectedIds,
  onClose,
  onChangeTitle,
  onChangeAccent,
  onToggleCandidate,
  onSave,
}: CreateMoveHighlightModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[96] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <section
        className="motion-surface w-full max-w-3xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              New Move Highlight
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick the Moves you want to keep on your profile after they expire.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
            disabled={saving}
            aria-label="Close create highlight"
          >
            x
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => onChangeTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                placeholder="Weekend edits"
                maxLength={28}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">Accent</label>
              <div className="grid grid-cols-2 gap-2">
                {PROFILE_ACCENT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChangeAccent(option.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      accent === option.id
                        ? "border-[var(--brand)] bg-[var(--brand)]/10"
                        : "border-[var(--line)] bg-white hover:border-[var(--brand)]/40"
                    }`}
                  >
                    <span
                      className="h-8 w-8 rounded-full border border-white/25"
                      style={{
                        background: option.solid,
                        boxShadow: `0 0 0 4px ${option.glow}`,
                      }}
                    />
                    <span className="text-xs font-semibold text-slate-700">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--plain-bg)] px-4 py-3 text-sm text-slate-500">
              Selected: <span className="font-semibold text-slate-700">{selectedIds.length}</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Choose Moves
            </label>
            <div className="grid max-h-[24rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {loading ? (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
                  Loading your current Moves...
                </p>
              ) : candidates.length === 0 ? (
                <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2">
                  Post a Move first, then you can save it as a highlight.
                </p>
              ) : (
                candidates.map((candidate) => {
                  const selected = selectedIds.includes(candidate.id);

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => onToggleCandidate(candidate.id)}
                      className={`overflow-hidden rounded-[1.4rem] border text-left transition ${
                        selected
                          ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-[0_18px_36px_-30px_rgba(63,123,255,0.6)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--brand)]/45"
                      }`}
                    >
                      <div className="relative aspect-[1.08/1]">
                        {candidate.mediaUrl && candidate.mediaType === "image" ? (
                          <Image
                            src={candidate.mediaUrl}
                            alt={candidate.caption || "Move"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 40vw"
                          />
                        ) : candidate.mediaUrl && candidate.mediaType === "video" ? (
                          <video
                            src={candidate.mediaUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <div className="h-full w-full" style={{ background: candidate.gradient }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                          {selected ? "Selected" : "Move"}
                        </span>
                        <p className="absolute inset-x-0 bottom-0 p-3 text-sm font-semibold text-white">
                          {candidate.caption || "Untitled Move"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || loading || selectedIds.length === 0}
          >
            {saving ? "Saving..." : "Save Highlight"}
          </button>
        </div>
      </section>
    </div>
  );
}
