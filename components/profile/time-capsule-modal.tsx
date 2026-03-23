"use client";

type CapsulePost = {
  id: string;
  caption: string;
  visibleAt?: string;
};

type TimeCapsuleModalProps = {
  post: CapsulePost | null;
  saving: boolean;
  actionId: string | null;
  error: string | null;
  value: string;
  minValue: string;
  currentOpeningLabel: string;
  selectedOpeningLabel: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onPublishNow: () => void;
  onSave: () => void;
};

export default function TimeCapsuleModal({
  post,
  saving,
  actionId,
  error,
  value,
  minValue,
  currentOpeningLabel,
  selectedOpeningLabel,
  onChangeValue,
  onClose,
  onPublishNow,
  onSave,
}: TimeCapsuleModalProps) {
  if (!post) {
    return null;
  }

  const busy = saving || actionId === post.id;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <section
        className="motion-surface w-full max-w-md p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit time capsule"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Edit Time Capsule
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick when this post becomes visible on your profile and in feeds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500 disabled:opacity-60"
            aria-label="Close time capsule editor"
          >
            x
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {post.caption || "Untitled post"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Current opening time: {currentOpeningLabel}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Open On</label>
            <input
              type="datetime-local"
              value={value}
              min={minValue}
              onChange={(event) => onChangeValue(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm transition focus:border-[var(--brand)] focus:outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              The post stays hidden until {selectedOpeningLabel}.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPublishNow}
              className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 disabled:opacity-60"
              disabled={busy}
            >
              {actionId === post.id ? "Publishing..." : "Publish Now"}
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={busy}
            >
              {saving ? "Saving..." : "Save Date"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
