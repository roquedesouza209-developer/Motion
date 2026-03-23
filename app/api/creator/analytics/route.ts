import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/database";
import { formatPostAge, isPostReleased } from "@/lib/server/format";
import type { FollowRecord, PostRecord } from "@/lib/server/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TIME_SLOTS = [
  { key: "early", label: "Early", startHour: 0, endHour: 4 },
  { key: "morning", label: "Morning", startHour: 4, endHour: 8 },
  { key: "midday", label: "Midday", startHour: 8, endHour: 12 },
  { key: "afternoon", label: "Afternoon", startHour: 12, endHour: 16 },
  { key: "evening", label: "Evening", startHour: 16, endHour: 20 },
  { key: "night", label: "Night", startHour: 20, endHour: 24 },
] as const;

type RangeOption = "7d" | "30d" | "90d";

function parseRange(input: string | null): RangeOption {
  return input === "7d" || input === "90d" ? input : "30d";
}

function getRangeDays(range: RangeOption): number {
  if (range === "7d") {
    return 7;
  }

  if (range === "90d") {
    return 90;
  }

  return 30;
}

function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display} ${suffix}`;
}

function estimateViews(post: PostRecord): number {
  const explicitViews =
    typeof post.viewCount === "number" && Number.isFinite(post.viewCount)
      ? Math.max(0, Math.round(post.viewCount))
      : 0;
  const watchBased =
    typeof post.watchTimeMs === "number" && Number.isFinite(post.watchTimeMs)
      ? Math.max(0, Math.round(post.watchTimeMs / 7000))
      : 0;
  const interactionFloor =
    post.likedBy.length + post.commentCount * 2 + (post.shareCount ?? 0) * 3;

  return Math.max(explicitViews, watchBased, interactionFloor);
}

function getFollowCreatedAt(follow: FollowRecord): number {
  const createdAt = follow.createdAt ? new Date(follow.createdAt).getTime() : NaN;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

function getSlotIndex(date: Date): number {
  const hour = date.getHours();
  const index = TIME_SLOTS.findIndex(
    (slot) => hour >= slot.startHour && hour < slot.endHour,
  );
  return index >= 0 ? index : TIME_SLOTS.length - 1;
}

export async function GET(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.accountType !== "creator") {
    return NextResponse.json(
      { error: "Creator analytics are only available for creator accounts." },
      { status: 403 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const range = parseRange(searchParams.get("range"));
  const rangeDays = getRangeDays(range);
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.getTime();
  const rangeStart = startOfToday - (rangeDays - 1) * DAY_MS;
  const db = await readDb();

  const creatorPosts = db.posts.filter((post) => {
    const createdAt = new Date(post.createdAt).getTime();
    const isOwner = post.userId === currentUser.id;
    const isCoAuthor = post.coAuthorIds?.includes(currentUser.id) ?? false;

    return (
      createdAt >= rangeStart &&
      (isOwner || isCoAuthor) &&
      post.deletedAt == null &&
      post.archivedAt == null &&
      isPostReleased(post)
    );
  });

  const totalViews = creatorPosts.reduce((sum, post) => sum + estimateViews(post), 0);
  const totalLikes = creatorPosts.reduce((sum, post) => sum + post.likedBy.length, 0);
  const totalComments = creatorPosts.reduce((sum, post) => sum + post.commentCount, 0);
  const totalShares = creatorPosts.reduce((sum, post) => sum + (post.shareCount ?? 0), 0);
  const totalEngagement = totalLikes + totalComments + totalShares;
  const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

  const followerRecords = db.follows.filter(
    (follow) => follow.followingId === currentUser.id,
  );
  const followerCount = followerRecords.length;
  const followingCount = db.follows.filter(
    (follow) => follow.followerId === currentUser.id,
  ).length;

  const growthSeries = Array.from({ length: rangeDays }, (_, index) => {
    const dayStart = rangeStart + index * DAY_MS;
    const nextDayStart = dayStart + DAY_MS;
    const gained = followerRecords.filter((follow) => {
      const createdAt = getFollowCreatedAt(follow);
      return createdAt >= dayStart && createdAt < Math.min(nextDayStart, now);
    }).length;

    return {
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(dayStart),
      shortLabel:
        rangeDays <= 7
          ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dayStart)
          : new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric" }).format(dayStart),
      gained,
    };
  });

  const followerGrowth = growthSeries.reduce((sum, day) => sum + day.gained, 0);

  const profileViewsInRange = db.profileViews
    .filter((view) => {
      const viewedAt = new Date(view.createdAt).getTime();
      return view.viewedId === currentUser.id && viewedAt >= rangeStart;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const followers = followerRecords
    .map((follow) => db.users.find((user) => user.id === follow.followerId))
    .filter((user): user is NonNullable<typeof user> => Boolean(user));

  const activityHeatmap = DAY_LABELS.map((dayLabel) => ({
    dayLabel,
    slots: TIME_SLOTS.map((slot) => ({
      key: slot.key,
      label: slot.label,
      value: 0,
    })),
  }));

  profileViewsInRange.forEach((view) => {
    const viewedAt = new Date(view.createdAt);
    if (Number.isNaN(viewedAt.getTime())) {
      return;
    }
    const dayIndex = viewedAt.getDay();
    const slotIndex = getSlotIndex(viewedAt);
    activityHeatmap[dayIndex].slots[slotIndex].value += 1;
  });

  followers.forEach((follower) => {
    if (!follower.lastActiveAt) {
      return;
    }
    const activeAt = new Date(follower.lastActiveAt);
    if (Number.isNaN(activeAt.getTime()) || activeAt.getTime() < rangeStart) {
      return;
    }
    const dayIndex = activeAt.getDay();
    const slotIndex = getSlotIndex(activeAt);
    activityHeatmap[dayIndex].slots[slotIndex].value += 2;
  });

  const activeTimes = TIME_SLOTS.map((slot, slotIndex) => ({
    label:
      slotIndex < TIME_SLOTS.length - 1
        ? `${formatHourLabel(slot.startHour)} - ${formatHourLabel(slot.endHour)}`
        : `${formatHourLabel(slot.startHour)} - 12 AM`,
    audience: activityHeatmap.reduce(
      (sum, day) => sum + (day.slots[slotIndex]?.value ?? 0),
      0,
    ),
  }))
    .filter((entry) => entry.audience > 0)
    .sort((a, b) => b.audience - a.audience)
    .slice(0, 4);

  const recentViewers = profileViewsInRange.slice(0, 5).map((view) => {
    const viewer = db.users.find((user) => user.id === view.viewerId);

    return {
      id: view.id,
      viewerId: view.viewerId,
      viewerName: viewer?.name ?? "Someone",
      viewerHandle: viewer?.handle ?? "motion.user",
      viewerAvatarGradient:
        viewer?.avatarGradient ?? "linear-gradient(135deg, #94a3b8, #64748b)",
      viewerAvatarUrl: viewer?.avatarUrl ?? null,
      createdAt: view.createdAt,
      time: formatPostAge(view.createdAt),
    };
  });

  const topPosts = creatorPosts
    .map((post) => {
      const views = estimateViews(post);
      const likes = post.likedBy.length;
      const comments = post.commentCount;
      const shares = post.shareCount ?? 0;
      const interactions = likes + comments + shares;

      return {
        id: post.id,
        kind: post.kind,
        caption: post.caption,
        createdAt: post.createdAt,
        timeAgo: formatPostAge(post.createdAt),
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        views,
        likes,
        comments,
        shares,
        engagementRate: views > 0 ? (interactions / views) * 100 : 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  return NextResponse.json({
    summary: {
      range,
      rangeDays,
      postViews: totalViews,
      likes: totalLikes,
      engagementRate: Number(engagementRate.toFixed(1)),
      followerGrowth,
      followerCount,
      followingCount,
      publishedPosts: creatorPosts.length,
      comments: totalComments,
      shares: totalShares,
    },
    growthSeries,
    activeTimes,
    activityHeatmap,
    recentViewers,
    topPosts,
  });
}
