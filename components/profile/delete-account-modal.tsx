"use client";

type DeleteAccountModalProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDelete: () => void;
};

export default function DeleteAccountModal({
  open,
  loading,
  error,
  onClose,
  onDelete,
}: DeleteAccountModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="motion-surface w-full max-w-sm p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete account"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Delete Account
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This will permanently delete your account and content.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
            aria-label="Close delete account"
          >
            x
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="h-10 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>
    </div>
  );
}
