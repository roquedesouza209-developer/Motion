"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { getProfileAccentMeta } from "@/lib/profile-styles";
import type { MoveHighlightDto } from "@/lib/server/types";

type MoveHighlightsStripProps = {
  highlights: MoveHighlightDto[];
  isViewingSelf: boolean;
  onCreate: () => void;
  onDelete?: (highlightId: string) => void;
};

function HighlightViewer({
  highlight,
  index,
  onClose,
  onPrev,
  onNext,
  onSelectIndex,
}: {
  highlight: MoveHighlightDto;
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (nextIndex: number) => void;
}) {
  const item = highlight.items[index];

  if (!item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <section
        className="motion-surface w-full max-w-3xl overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-[26rem] bg-slate-950">
          {item.mediaUrl && item.mediaType === "image" ? (
            <Image
              src={item.mediaUrl}
              alt={highlight.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 70vw"
            />
          ) : item.mediaUrl && item.mediaType === "video" ? (
            <video
              src={item.mediaUrl}
              className="h-full w-full object-cover"
              controls
              playsInline
            />
          ) : (
            <div className="h-full w-full" style={{ background: item.gradient }} />
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                Move Highlight
              </p>
              <h3
                className="mt-1 text-xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {highlight.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-sm"
              aria-label="Close highlight"
            >
              x
            </button>
          </div>
          {highlight.items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm"
                aria-label="Previous highlight item"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm"
                aria-label="Next highlight item"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {item.caption || "Saved from Moves"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {index + 1} of {highlight.items.length}
            </p>
          </div>
          <div className="flex gap-1.5">
            {highlight.items.map((entry, entryIndex) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectIndex(entryIndex)}
                className={`h-2.5 rounded-full transition ${
                  entryIndex === index
                    ? "w-8 bg-[var(--brand)]"
                    : "w-2.5 bg-[var(--line)]"
                }`}
                aria-label={`Highlight item ${entryIndex + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MoveHighlightsStrip({
  highlights,
  isViewingSelf,
  onCreate,
  onDelete,
}: MoveHighlightsStripProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  const activeHighlight = useMemo(
    () => highlights.find((highlight) => highlight.id === activeHighlightId) ?? null,
    [activeHighlightId, highlights],
  );

  return (
    <>
      <section className="mt-5 rounded-[1.7rem] border border-[var(--line)] bg-white/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Moves Highlights
            </p>
            <h2
              className="mt-1 text-lg font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Saved moments from Moves
            </h2>
          </div>
          {isViewingSelf ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              + New Highlight
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
          {isViewingSelf ? (
            <button
              type="button"
              onClick={onCreate}
              className="flex w-24 shrink-0 flex-col items-center gap-2"
            >
              <span className="grid h-20 w-20 place-items-center rounded-full border border-dashed border-[var(--line)] bg-[var(--plain-bg)] text-2xl font-light text-slate-500">
                +
              </span>
              <span className="line-clamp-2 text-center text-xs font-semibold text-slate-600">
                New Highlight
              </span>
            </button>
          ) : null}

          {highlights.map((highlight) => {
            const accent = getProfileAccentMeta(highlight.accent);
            const preview = highlight.preview;

            return (
              <div key={highlight.id} className="flex w-24 shrink-0 flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveHighlightId(highlight.id);
                    setActiveItemIndex(0);
                  }}
                  className="relative h-20 w-20 rounded-full p-1 transition hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${accent.solid}, color-mix(in srgb, ${accent.solid} 20%, white 80%))`,
                    boxShadow: `0 18px 30px -24px ${accent.glow}`,
                  }}
                >
                  <span className="relative block h-full w-full overflow-hidden rounded-full border-4 border-[var(--plain-bg)] bg-[var(--plain-bg)]">
                    {preview?.mediaUrl && preview.mediaType === "image" ? (
                      <Image
                        src={preview.mediaUrl}
                        alt={highlight.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : preview?.mediaUrl && preview.mediaType === "video" ? (
                      <video
                        src={preview.mediaUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <span
                        className="block h-full w-full"
                        style={{ background: preview?.gradient ?? "var(--brand)" }}
                      />
                    )}
                  </span>
                </button>
                <div className="flex w-full flex-col items-center gap-1">
                  <span className="line-clamp-2 text-center text-xs font-semibold text-slate-700">
                    {highlight.title}
                  </span>
                  {isViewingSelf && onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(highlight.id)}
                      className="text-[11px] font-semibold text-slate-500 transition hover:text-rose-600"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {!isViewingSelf && highlights.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">No highlights yet.</p>
          ) : null}
        </div>
      </section>

      {activeHighlight ? (
        <HighlightViewer
          highlight={activeHighlight}
          index={activeItemIndex}
          onClose={() => {
            setActiveHighlightId(null);
            setActiveItemIndex(0);
          }}
          onPrev={() =>
            setActiveItemIndex((current) =>
              activeHighlight.items.length === 0
                ? current
                : (current - 1 + activeHighlight.items.length) % activeHighlight.items.length,
            )
          }
          onNext={() =>
            setActiveItemIndex((current) =>
              activeHighlight.items.length === 0
                ? current
                : (current + 1) % activeHighlight.items.length,
            )
          }
          onSelectIndex={setActiveItemIndex}
        />
      ) : null}
    </>
  );
}
