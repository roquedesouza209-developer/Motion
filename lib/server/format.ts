import type {
  PostDto,
  PostRecord,
  Presence,
  StoryDto,
  StoryRecord,
  UserRecord,
} from "@/lib/server/types";

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    const minutes = Math.max(1, Math.floor(diff / minute));
    return `${minutes}m`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h`;
  }

  const days = Math.floor(diff / day);
  return `${days}d`;
}

export function resolvePresence(userId: string): Presence {
  const checksum = [...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return checksum % 2 === 0 ? "Online" : "Away";
}

export function buildHandle(name: string, existingHandles: string[]): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".");

  const root = normalized.length > 0 ? normalized : "motion.user";
  let candidate = root;
  let suffix = 1;

  while (existingHandles.includes(candidate)) {
    candidate = `${root}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function mapPostToDto({
  post,
  usersById,
  currentUserId,
}: {
  post: PostRecord;
  usersById: Map<string, UserRecord>;
  currentUserId: string | null;
}): PostDto {
  const author = usersById.get(post.userId);

  return {
    id: post.id,
    author: author?.name ?? "Unknown Creator",
    handle: author ? `@${author.handle}` : "@unknown",
    scope: post.scope,
    kind: post.kind,
    caption: post.caption,
    location: post.location,
    likes: post.likedBy.length,
    liked: currentUserId ? post.likedBy.includes(currentUserId) : false,
    saved: currentUserId ? post.savedBy.includes(currentUserId) : false,
    comments: post.commentCount,
    gradient: post.gradient,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
  };
}

export function mapStoryToDto({
  story,
  usersById,
  currentUserId,
}: {
  story: StoryRecord;
  usersById: Map<string, UserRecord>;
  currentUserId: string | null;
}): StoryDto {
  const owner = usersById.get(story.userId);
  const msLeft = new Date(story.expiresAt).getTime() - Date.now();
  const minutesLeft = Math.max(1, Math.floor(msLeft / 60_000));

  return {
    id: story.id,
    name: owner?.name.split(" ")[0] ?? "Creator",
    role: owner?.role ?? "Member",
    minutesLeft,
    gradient: story.gradient,
    caption: story.caption,
    seen: currentUserId ? story.seenBy.includes(currentUserId) : false,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
  };
}
