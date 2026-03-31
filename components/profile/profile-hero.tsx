"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import UserAvatar from "@/components/user-avatar";
import { getProfileAccentMeta, getProfileCoverBackground } from "@/lib/profile-styles";
import type { ProfileAccent, ProfileCoverTheme } from "@/lib/server/types";

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
  coverTheme?: ProfileCoverTheme;
  coverImageUrl?: string;
  profileAccent?: ProfileAccent;
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

function SectionActionButton({
  children,
  onClick,
  title,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
      <button
        type="button"
        onClick={onClick}
        className={`grid h-9 w-9 place-items-center rounded-full border transition ${
          tone === "danger"
            ? "border-rose-200 bg-[color-mix(in_srgb,var(--plain-bg-elevated)_92%,transparent)] text-rose-500 hover:border-rose-400 hover:text-rose-600"
            : "border-[var(--line)] bg-[color-mix(in_srgb,var(--plain-bg-elevated)_92%,transparent)] text-[var(--muted-ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        }`}
        aria-label={title}
        title={title}
    >
      {children}
    </button>
  );
}

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
  const accent = getProfileAccentMeta(owner.profileAccent);
  const coverBackground = getProfileCoverBackground(owner.coverTheme);

  return (
    <section className="motion-surface overflow-hidden p-0">
      <div className="relative h-44 overflow-hidden sm:h-56">
        <div className="absolute inset-0" style={{ background: coverBackground }} />
        {owner.coverImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${owner.coverImageUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,12,9,0.72)] via-[rgba(34,24,19,0.2)] to-transparent" />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/92 backdrop-blur-sm">
            @{owner.handle}
          </span>
          {owner.accountType ? (
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/92 backdrop-blur-sm">
              {owner.accountType === "creator" ? "Creator" : "Public"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="-mt-12 flex flex-col gap-5 lg:-mt-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div
              className="inline-flex w-fit rounded-[1.75rem] bg-[var(--plain-bg)]/92 p-1.5 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.7)] backdrop-blur-sm"
              style={{
                boxShadow: `0 0 0 1px ${accent.glow}, 0 24px 48px -36px ${accent.glow}`,
              }}
            >
              <UserAvatar
                name={owner.name}
                avatarGradient={owner.avatarGradient}
                avatarUrl={owner.avatarUrl}
                className="h-24 w-24 text-lg font-bold ring-4 ring-white/75 sm:h-28 sm:w-28"
                textClassName="text-lg font-bold text-white"
                sizes="112px"
              />
            </div>

            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-2xl font-semibold text-[var(--ink-strong)] sm:text-3xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {owner.name}
                </h1>

                {isViewingSelf ? (
                  <>
                    <SectionActionButton onClick={onOpenEditProfile} title="Edit Profile">
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
                    </SectionActionButton>
                    <SectionActionButton
                      onClick={onOpenDeleteAccount}
                      title="Delete Account"
                      tone="danger"
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
                    </SectionActionButton>
                  </>
                ) : isAuthenticated ? (
                  <button
                    type="button"
                    onClick={onToggleFollow}
                    disabled={followLoading}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isFollowing
                        ? "border border-[var(--line)] bg-[color-mix(in_srgb,var(--plain-bg-elevated)_92%,transparent)] text-[var(--ink)] hover:border-[var(--brand)]"
                        : "text-white"
                    } ${followLoading ? "opacity-70" : ""}`}
                    style={
                      isFollowing
                        ? undefined
                        : {
                            background: accent.solid,
                            boxShadow: `0 18px 34px -24px ${accent.glow}`,
                          }
                    }
                  >
                    {followLoading ? "Working..." : isFollowing ? "Following" : "Follow"}
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{
                      background: accent.solid,
                      boxShadow: `0 18px 34px -24px ${accent.glow}`,
                    }}
                  >
                    Sign In
                  </Link>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--muted-ink)]">@{owner.handle}</p>
              {isViewingSelf ? (
                <p className="mt-1 text-xs text-[var(--muted-ink)]">{viewerEmail ?? ""}</p>
              ) : null}
              {owner.bio ? <p className="mt-3 max-w-2xl text-sm text-[var(--ink)]">{owner.bio}</p> : null}
            </div>
          </div>

          <div
            className={`grid gap-2 ${isViewingSelf ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
          >
            <div className="motion-stat-card px-4 py-3 text-center">
              <p className="text-lg font-semibold text-[var(--ink-strong)]">{postCount}</p>
              <p className="text-xs text-[var(--muted-ink)]">Posts</p>
            </div>
            <button
              type="button"
              onClick={onOpenFollowers}
              className="motion-stat-card px-4 py-3 text-center transition hover:border-[var(--brand)]"
            >
              <p className="text-lg font-semibold text-[var(--ink-strong)]">{followerCount}</p>
              <p className="text-xs text-[var(--muted-ink)]">Followers</p>
            </button>
            <button
              type="button"
              onClick={onOpenFollowing}
              className="motion-stat-card px-4 py-3 text-center transition hover:border-[var(--brand)]"
            >
              <p className="text-lg font-semibold text-[var(--ink-strong)]">{followingCount}</p>
              <p className="text-xs text-[var(--muted-ink)]">Following</p>
            </button>
            {isViewingSelf ? (
              <div className="motion-stat-card px-4 py-3 text-center">
                <p className="text-lg font-semibold text-[var(--ink-strong)]">{savedCount}</p>
                <p className="text-xs text-[var(--muted-ink)]">Vault</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {isViewingSelf ? (
            <>
              <div className="motion-pill-bar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectTab(tab.id)}
                    className={`motion-pill-button ${activeTab === tab.id ? "is-active" : ""}`}
                    style={
                      activeTab === tab.id
                        ? {
                            background: accent.solid,
                            boxShadow: `0 18px 30px -26px ${accent.glow}`,
                          }
                        : undefined
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeTab === "posts" ? (
                  <button
                    type="button"
                    onClick={onToggleLayoutEdit}
                    className={`flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                      layoutEditMode
                        ? "text-white"
                        : "border-[var(--line)] bg-[color-mix(in_srgb,var(--plain-bg-elevated)_92%,transparent)] text-[var(--ink)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    }`}
                    style={
                      layoutEditMode
                        ? {
                            borderColor: accent.solid,
                            background: accent.solid,
                            boxShadow: `0 18px 30px -26px ${accent.glow}`,
                          }
                        : undefined
                    }
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
                    className="flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition hover:brightness-105"
                    style={{
                      borderColor: accent.glow,
                      background: `${accent.solid}1a`,
                      color: accent.solid,
                    }}
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
                     className="flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--plain-bg-elevated)_92%,transparent)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
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
              </div>
            </>
          ) : (
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">Posts</p>
          )}
        </div>
      </div>
    </section>
  );
}
