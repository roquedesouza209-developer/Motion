"use client";

import Link from "next/link";

import UserAvatar from "@/components/user-avatar";

type ProfileTab = {
  id: string;
  label: string;
};

type ProfileOwner = {
  name: string;
  handle: string;
  avatarGradient: string;
  avatarUrl?: string;
  accountType?: "creator" | "public";
  bio?: string | null;
};

type ProfileHeroProps = {
  owner: ProfileOwner;
  isViewingSelf: boolean;
  viewerEmail?: string | null;
  isAuthenticated: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  savedCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  tabs: ProfileTab[];
  activeTab: string;
  layoutEditMode: boolean;
  showCreatorStudio: boolean;
  onSelectTab: (tabId: string) => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onToggleLayoutEdit: () => void;
  onOpenSettings: () => void;
  onOpenEditProfile: () => void;
  onOpenDeleteAccount: () => void;
  onToggleFollow: () => void;
};

export default function ProfileHero({
  owner,
  isViewingSelf,
  viewerEmail,
  isAuthenticated,
  postCount,
  followerCount,
  followingCount,
  savedCount,
  isFollowing,
  followLoading,
  tabs,
  activeTab,
  layoutEditMode,
  showCreatorStudio,
  onSelectTab,
  onOpenFollowers,
  onOpenFollowing,
  onToggleLayoutEdit,
  onOpenSettings,
  onOpenEditProfile,
  onOpenDeleteAccount,
  onToggleFollow,
}: ProfileHeroProps) {
  return (
    <section className="motion-surface p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={owner.name}
            avatarGradient={owner.avatarGradient}
            avatarUrl={owner.avatarUrl}
            className="h-20 w-20 text-lg font-bold ring-2 ring-[var(--line)]"
            textClassName="text-lg font-bold text-white"
            sizes="80px"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-semibold text-slate-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {owner.name}
              </h1>
              {isViewingSelf ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenEditProfile}
                    className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line)] bg-white text-slate-500 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    aria-label="Edit profile"
                    title="Edit Profile"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13.8 2.8a2.1 2.1 0 0 1 3 3L6.3 16.3l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenDeleteAccount}
                    className="grid h-8 w-8 place-items-center rounded-full border border-rose-200 bg-white text-rose-500 transition hover:border-rose-400 hover:text-rose-600"
                    aria-label="Delete account"
                    title="Delete Account"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 5h14" />
                      <path d="M8 5V3h4v2" />
                      <path d="M6 5l1 11h6l1-11" />
                      <path d="M9 9v5M11 9v5" />
                    </svg>
                  </button>
                </>
              ) : isAuthenticated ? (
                <button
                  type="button"
                  onClick={onToggleFollow}
                  disabled={followLoading}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isFollowing
                      ? "border border-[var(--line)] bg-white text-slate-700 hover:border-[var(--brand)]"
                      : "bg-[var(--brand)] text-white"
                  } ${followLoading ? "opacity-70" : ""}`}
                >
                  {followLoading ? "Working..." : isFollowing ? "Following" : "Follow"}
                </button>
              ) : (
                <Link
                  href="/"
                  className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Sign In
                </Link>
              )}
            </div>
            <p className="text-sm text-slate-500">@{owner.handle}</p>
            {owner.accountType ? (
              <p className="mt-2 inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {owner.accountType === "creator" ? "Creator Account" : "Public Account"}
              </p>
            ) : null}
            {isViewingSelf ? <p className="mt-1 text-xs text-slate-500">{viewerEmail ?? ""}</p> : null}
            {owner.bio ? <p className="mt-2 max-w-md text-sm text-slate-700">{owner.bio}</p> : null}
          </div>
        </div>

        <div className={`grid gap-2 ${isViewingSelf ? "grid-cols-4" : "grid-cols-3"}`}>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center">
            <p className="text-lg font-semibold text-slate-900">{postCount}</p>
            <p className="text-xs text-slate-500">Posts</p>
          </div>
          <button
            type="button"
            onClick={onOpenFollowers}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center transition hover:border-[var(--brand)]"
          >
            <p className="text-lg font-semibold text-slate-900">{followerCount}</p>
            <p className="text-xs text-slate-500">Followers</p>
          </button>
          <button
            type="button"
            onClick={onOpenFollowing}
            className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center transition hover:border-[var(--brand)]"
          >
            <p className="text-lg font-semibold text-slate-900">{followingCount}</p>
            <p className="text-xs text-slate-500">Following</p>
          </button>
          {isViewingSelf ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center">
              <p className="text-lg font-semibold text-slate-900">{savedCount}</p>
              <p className="text-xs text-slate-500">Vault</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        {isViewingSelf ? (
          <>
            <div className="inline-flex rounded-full border border-[var(--line)] bg-white p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === tab.id ? "bg-[var(--brand)] text-white" : "text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === "posts" ? (
              <button
                type="button"
                onClick={onToggleLayoutEdit}
                className={`flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                  layoutEditMode
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-[var(--line)] bg-white text-slate-700 hover:border-[var(--brand)] hover:text-[var(--brand)]"
                }`}
                aria-pressed={layoutEditMode}
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
                  <rect x="3" y="3" width="6" height="6" rx="1.2" />
                  <rect x="11" y="3" width="6" height="6" rx="1.2" />
                  <rect x="3" y="11" width="6" height="6" rx="1.2" />
                  <rect x="11" y="11" width="6" height="6" rx="1.2" />
                </svg>
                {layoutEditMode ? "Done" : "Edit Layout"}
              </button>
            ) : null}
            {showCreatorStudio ? (
              <Link
                href="/creator-studio"
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-4 text-sm font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand)]/15"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 16h14" />
                  <path d="M5 13V8" />
                  <path d="M10 13V4" />
                  <path d="M15 13v-6" />
                </svg>
                Creator Studio
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              aria-label="Settings"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 0 1-3.6 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 0 1 0-3.6h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 0 1 3.6 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.8 1.8 0 1 1 0 3.6h-.2a1 1 0 0 0-.9.7Z" />
              </svg>
              Settings
            </button>
          </>
        ) : (
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Posts</p>
        )}
      </div>
    </section>
  );
}
