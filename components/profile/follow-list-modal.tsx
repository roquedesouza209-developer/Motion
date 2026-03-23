"use client";

import UserAvatar from "@/components/user-avatar";

type FollowListUser = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  avatarGradient: string;
};

type FollowListModalProps = {
  listType: "followers" | "following";
  loading: boolean;
  items: FollowListUser[];
  followerCount: number;
  followingCount: number;
  isViewingSelf: boolean;
  followActionId: string | null;
  onClose: () => void;
  onOpenProfile: (handle: string) => void;
  onUnfollow: (user: FollowListUser) => void;
};

export default function FollowListModal({
  listType,
  loading,
  items,
  followerCount,
  followingCount,
  isViewingSelf,
  followActionId,
  onClose,
  onOpenProfile,
  onUnfollow,
}: FollowListModalProps) {
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
        aria-label="Followers list"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {listType === "followers" ? "Followers" : "Following"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {listType === "followers"
                ? `${loading ? followerCount : items.length} total`
                : `${loading ? followingCount : items.length} total`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
            aria-label="Close followers list"
          >
            x
          </button>
        </div>
        <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
              Loading...
            </p>
          ) : items.length > 0 ? (
            items.map((follow) => (
              <div
                key={follow.id}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-[var(--brand)]"
              >
                <button
                  type="button"
                  onClick={() => onOpenProfile(follow.handle)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <UserAvatar
                    name={follow.name}
                    avatarGradient={follow.avatarGradient}
                    avatarUrl={follow.avatarUrl}
                    className="h-10 w-10 text-[11px] font-bold"
                    textClassName="text-[11px] font-bold text-white"
                    sizes="40px"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{follow.name}</p>
                    <p className="text-xs text-slate-500">@{follow.handle}</p>
                  </div>
                </button>
                {isViewingSelf && listType === "following" ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onUnfollow(follow);
                    }}
                    disabled={followActionId === (follow.id || follow.handle)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
                    aria-label={`Unfollow ${follow.name}`}
                    title="Unfollow"
                  >
                    {followActionId === (follow.id || follow.handle) ? (
                      <span className="text-xs font-semibold">...</span>
                    ) : (
                      <svg
                        viewBox="0 0 20 20"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 10h10" />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
              Nothing here yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
