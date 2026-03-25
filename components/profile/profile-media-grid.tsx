"use client";

import type { DragEvent } from "react";

import LivePostAge from "@/components/live-post-age";
import Image from "next/image";

type ProfileTab = "posts" | "saved" | "tagged" | "archive" | "bin";
type MediaType = "image" | "video";

export type ProfileGridPost = {
  id: string;
  author: string;
  handle: string;
  userId: string;
  coAuthors?: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  }[];
  collabInvites?: {
    id: string;
    name: string;
    handle: string;
    avatarGradient: string;
    avatarUrl?: string;
  }[];
  kind: "Photo" | "Reel";
  caption: string;
  location: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: number;
  shareCount?: number;
  gradient: string;
  createdAt: string;
  timeAgo: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  immersiveVideo?: boolean;
  visibleAt?: string;
  deletedAt?: string;
  archivedAt?: string;
};

type ProfileMediaGridProps = {
  posts: ProfileGridPost[];
  activeTab: ProfileTab;
  layoutEditMode: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  canReorder: boolean;
  viewerUserId?: string | null;
  displayPinnedIds: Set<string>;
  capsuleActionId: string | null;
  capsuleSaving: boolean;
  capsuleEditorPostId?: string | null;
  onToggleSave: (postId: string) => void;
  onDelete: (postId: string) => void;
  onRestore: (postId: string) => void;
  onArchive: (postId: string) => void;
  onUnarchive: (postId: string) => void;
  onEditCapsule: (post: ProfileGridPost) => void;
  onPublishCapsuleNow: (postId: string) => void;
  onTogglePin: (postId: string) => void;
  onWithdrawInvite: (postId: string) => void;
  onDragStartFor: (postId: string) => (event: DragEvent<HTMLElement>) => void;
  onDragOverFor: (postId: string) => (event: DragEvent<HTMLElement>) => void;
  onDropFor: (postId: string) => (event: DragEvent<HTMLElement>) => void;
  onDragEnd: (event: DragEvent<HTMLElement>) => void;
};

function SaveGlyph({ saved }: { saved: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill={saved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.1 3.2h9.8a1.4 1.4 0 0 1 1.4 1.4v12l-6.3-3.4-6.3 3.4v-12a1.4 1.4 0 0 1 1.4-1.4Z" />
    </svg>
  );
}

function formatBinCountdown(deletedAt?: string): string | null {
  if (!deletedAt) {
    return null;
  }

  const removedAt = new Date(deletedAt).getTime();
  if (Number.isNaN(removedAt)) {
    return null;
  }

  const binRetentionMs = 30 * 24 * 60 * 60 * 1000;
  const msLeft = binRetentionMs - (Date.now() - removedAt);

  if (msLeft <= 0) {
    return "Expired";
  }

  const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  return `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
}

function formatCapsuleCountdown(visibleAt?: string): string | null {
  if (!visibleAt) {
    return null;
  }

  const releaseAt = new Date(visibleAt).getTime();
  if (Number.isNaN(releaseAt)) {
    return null;
  }

  const msLeft = releaseAt - Date.now();
  if (msLeft <= 0) {
    return null;
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (msLeft < hour) {
    const minutesLeft = Math.max(1, Math.ceil(msLeft / minute));
    return `Opens in ${minutesLeft} ${minutesLeft === 1 ? "min" : "mins"}`;
  }

  if (msLeft < day) {
    const hoursLeft = Math.max(1, Math.ceil(msLeft / hour));
    return `Opens in ${hoursLeft} ${hoursLeft === 1 ? "hr" : "hrs"}`;
  }

  const daysLeft = Math.max(1, Math.ceil(msLeft / day));
  return `Opens in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
}

function emptyStateLabel(activeTab: ProfileTab): string {
  switch (activeTab) {
    case "saved":
      return "No vault posts yet.";
    case "tagged":
      return "No tagged posts yet.";
    case "archive":
      return "No archived posts yet.";
    case "bin":
      return "Bin is empty.";
    default:
      return "No posts yet.";
  }
}

function MediaTile({
  post,
  onToggleSave,
  onDelete,
  onRestore,
  onArchive,
  onUnarchive,
  onEditCapsule,
  onPublishCapsuleNow,
  onTogglePin,
  onWithdrawInvite,
  canDelete,
  canRestore,
  canArchive,
  canUnarchive,
  canEditCapsule,
  canPublishCapsuleNow,
  capsuleBusy,
  canPin,
  pinned,
  canWithdrawInvite,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
}: {
  post: ProfileGridPost;
  onToggleSave: (postId: string) => void;
  onDelete: (postId: string) => void;
  onRestore?: (postId: string) => void;
  onArchive?: (postId: string) => void;
  onUnarchive?: (postId: string) => void;
  onEditCapsule?: (post: ProfileGridPost) => void;
  onPublishCapsuleNow?: (postId: string) => void;
  onTogglePin?: (postId: string) => void;
  onWithdrawInvite?: (postId: string) => void;
  canDelete: boolean;
  canRestore?: boolean;
  canArchive?: boolean;
  canUnarchive?: boolean;
  canEditCapsule?: boolean;
  canPublishCapsuleNow?: boolean;
  capsuleBusy?: boolean;
  canPin?: boolean;
  pinned?: boolean;
  canWithdrawInvite?: boolean;
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: (event: DragEvent<HTMLElement>) => void;
  isDragging: boolean;
  isDropTarget: boolean;
}) {
  const binCountdown = formatBinCountdown(post.deletedAt);
  const capsuleCountdown = formatCapsuleCountdown(post.visibleAt);
  const hasInvitePending = Boolean(post.collabInvites && post.collabInvites.length > 0);
  const isPermanentDelete = Boolean(canRestore);
  const canArchivePost = Boolean(canArchive && onArchive);
  const canUnarchivePost = Boolean(canUnarchive && onUnarchive);
  const canEditCapsulePost = Boolean(canEditCapsule && onEditCapsule && capsuleCountdown);
  const canPublishCapsulePost = Boolean(
    canPublishCapsuleNow && onPublishCapsuleNow && capsuleCountdown,
  );
  const canPinPost = Boolean(canPin && onTogglePin);
  const canWithdrawCollabInvite = Boolean(
    canWithdrawInvite && onWithdrawInvite && hasInvitePending,
  );
  const isPinned = Boolean(pinned);

  return (
    <article
      className={`group relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-white ${
        draggable ? "profile-tile-draggable" : ""
      } ${isPinned ? "profile-tile-pinned" : ""} ${isDragging ? "profile-tile-dragging" : ""} ${
        isDropTarget ? "profile-tile-drop" : ""
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-grabbed={draggable ? isDragging : undefined}
    >
      {post.mediaUrl && post.mediaType === "image" ? (
        <Image
          src={post.mediaUrl}
          alt={`${post.author} post`}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : post.mediaUrl && post.mediaType === "video" ? (
        <video
          src={post.mediaUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="h-full w-full" style={{ background: post.gradient }} />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/70" />
      <div className="absolute left-3 top-3 flex flex-col gap-1">
        <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          {post.kind}
        </span>
        {isPinned ? (
          <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            Pinned
          </span>
        ) : null}
        {capsuleCountdown ? (
          <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            Time Capsule
          </span>
        ) : null}
        {post.immersiveVideo ? (
          <span className="rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 backdrop-blur-sm">
            360
          </span>
        ) : null}
        {hasInvitePending ? (
          <span className="rounded-full bg-amber-500/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {post.collabInvites?.length === 1
              ? `Invite pending - @${post.collabInvites[0].handle}`
              : `${post.collabInvites?.length ?? 0} invites pending`}
          </span>
        ) : null}
        {binCountdown ? (
          <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {binCountdown}
          </span>
        ) : null}
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <LivePostAge createdAt={post.createdAt} initialLabel={post.timeAgo} />
        </span>
        {capsuleCountdown ? (
          <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {capsuleCountdown}
          </span>
        ) : null}
        {canEditCapsulePost ? (
          <button
            type="button"
            onClick={() => onEditCapsule?.(post)}
            disabled={capsuleBusy}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Edit time capsule"
            title="Edit time capsule"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="10" cy="10" r="6.6" />
              <path d="M10 6.9V10l2 1.6" />
            </svg>
          </button>
        ) : null}
        {canPublishCapsulePost ? (
          <button
            type="button"
            onClick={() => onPublishCapsuleNow?.(post.id)}
            disabled={capsuleBusy}
            className="grid h-7 w-7 place-items-center rounded-full border border-emerald-200 bg-emerald-500/85 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Publish time capsule now"
            title="Publish now"
          >
            {capsuleBusy ? (
              <span className="text-[10px] font-semibold">...</span>
            ) : (
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 10h7" />
                <path d="m8 6 4 4-4 4" />
                <path d="M14 4h2.5A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5H14" />
              </svg>
            )}
          </button>
        ) : null}
        {canPinPost ? (
          <button
            type="button"
            onClick={() => onTogglePin?.(post.id)}
            className={`grid h-7 w-7 place-items-center rounded-full border text-white transition ${
              isPinned
                ? "border-[var(--brand)] bg-[var(--brand)]/90"
                : "border-white/15 bg-black/45 hover:bg-black/60"
            }`}
            aria-label={isPinned ? "Unpin post" : "Pin post"}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3h6l-1 5 4 4v2H6v-2l4-4-1-5Z" />
              <path d="M12 14v7" />
            </svg>
          </button>
        ) : null}
        {canWithdrawCollabInvite ? (
          <button
            type="button"
            onClick={() => onWithdrawInvite?.(post.id)}
            className="grid h-7 w-7 place-items-center rounded-full border border-amber-200 bg-amber-500/70 text-white transition hover:bg-amber-500"
            aria-label="Withdraw invite"
            title="Withdraw invite"
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
              <path d="M5 10h10" />
            </svg>
          </button>
        ) : null}
        {canRestore && onRestore ? (
          <button
            type="button"
            onClick={() => onRestore(post.id)}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
            aria-label="Restore post"
            title="Restore"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
        ) : null}
        {canUnarchivePost ? (
          <button
            type="button"
            onClick={() => onUnarchive?.(post.id)}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
            aria-label="Unarchive post"
            title="Unarchive"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M12 12v-4" />
              <path d="m8 12 4-4 4 4" />
            </svg>
          </button>
        ) : null}
        {canArchivePost ? (
          <button
            type="button"
            onClick={() => onArchive?.(post.id)}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
            aria-label="Archive post"
            title="Archive"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M12 8v4" />
              <path d="m8 12 4 4 4-4" />
            </svg>
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            className={`grid h-7 w-7 place-items-center rounded-full border text-white transition ${
              isPermanentDelete
                ? "border-rose-200 bg-rose-500/80 hover:bg-rose-500"
                : "border-white/15 bg-black/45 hover:bg-black/60"
            }`}
            aria-label={isPermanentDelete ? "Delete permanently" : "Delete post"}
            title={isPermanentDelete ? "Delete permanently" : "Delete"}
          >
            <svg
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 6.3h11" />
              <path d="M8.2 6.3V4.4h3.6v1.9" />
              <path d="M6.4 6.3l.6 9.3h6l.6-9.3" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
        <div className="min-w-0 text-white">
          <p className="truncate text-sm font-semibold">{post.author}</p>
          <p className="truncate text-xs text-white/80">{post.caption || post.handle}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleSave(post.id)}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-sm ${
            post.saved
              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
              : "border-white/20 bg-black/35 text-white"
          }`}
          aria-label={post.saved ? "Remove from vault" : "Vault post"}
          title={post.saved ? "Vaulted" : "Vault"}
        >
          <SaveGlyph saved={post.saved} />
        </button>
      </div>
    </article>
  );
}

export default function ProfileMediaGrid({
  posts,
  activeTab,
  layoutEditMode,
  draggingId,
  dragOverId,
  canReorder,
  viewerUserId,
  displayPinnedIds,
  capsuleActionId,
  capsuleSaving,
  capsuleEditorPostId,
  onToggleSave,
  onDelete,
  onRestore,
  onArchive,
  onUnarchive,
  onEditCapsule,
  onPublishCapsuleNow,
  onTogglePin,
  onWithdrawInvite,
  onDragStartFor,
  onDragOverFor,
  onDropFor,
  onDragEnd,
}: ProfileMediaGridProps) {
  if (posts.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-slate-500">
        {emptyStateLabel(activeTab)}
      </div>
    );
  }

  return (
    <div
      className={`profile-grid mt-5 grid grid-cols-3 gap-2 sm:gap-3 ${
        layoutEditMode ? "is-editing" : ""
      } ${draggingId ? "is-dragging" : ""}`}
    >
      {posts.map((post) => {
        const isPinned = displayPinnedIds.has(post.id);
        const hasActiveCapsule = Boolean(formatCapsuleCountdown(post.visibleAt));

        return (
          <MediaTile
            key={post.id}
            post={post}
            onToggleSave={onToggleSave}
            onDelete={onDelete}
            onRestore={onRestore}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onEditCapsule={onEditCapsule}
            onPublishCapsuleNow={onPublishCapsuleNow}
            onTogglePin={onTogglePin}
            onWithdrawInvite={onWithdrawInvite}
            canDelete={post.userId === viewerUserId && (activeTab === "posts" || activeTab === "bin")}
            canRestore={post.userId === viewerUserId && activeTab === "bin"}
            canArchive={post.userId === viewerUserId && activeTab === "posts"}
            canUnarchive={post.userId === viewerUserId && activeTab === "archive"}
            canEditCapsule={post.userId === viewerUserId && activeTab === "posts" && hasActiveCapsule}
            canPublishCapsuleNow={
              post.userId === viewerUserId && activeTab === "posts" && hasActiveCapsule
            }
            capsuleBusy={
              capsuleActionId === post.id ||
              (capsuleSaving && capsuleEditorPostId === post.id)
            }
            canPin={canReorder}
            canWithdrawInvite={
              post.userId === viewerUserId &&
              activeTab === "posts" &&
              Boolean(post.collabInvites && post.collabInvites.length > 0)
            }
            pinned={isPinned}
            draggable={canReorder && !isPinned}
            onDragStart={onDragStartFor(post.id)}
            onDragOver={onDragOverFor(post.id)}
            onDrop={onDropFor(post.id)}
            onDragEnd={onDragEnd}
            isDragging={draggingId === post.id}
            isDropTarget={dragOverId === post.id && draggingId !== post.id && !isPinned}
          />
        );
      })}
    </div>
  );
}
