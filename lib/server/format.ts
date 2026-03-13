import type {
  CommentDto,
  CommentRecord,
  MediaItem,
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

export function formatPostAge(isoDate: string): string {
  const diff = Math.max(1_000, Date.now() - new Date(isoDate).getTime());
  const second = 1_000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    const seconds = Math.max(1, Math.floor(diff / second));
    return `${seconds} ${seconds === 1 ? "Sec" : "Secs"} ago`;
  }

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} ${minutes === 1 ? "Min" : "Mins"} ago`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} ${hours === 1 ? "Hr" : "Hrs"} ago`;
  }

  if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} ${days === 1 ? "Day" : "Days"} ago`;
  }

  const weeks = Math.floor(diff / week);
  return `${weeks} ${weeks === 1 ? "Week" : "Weeks"} ago`;
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

function resolveMedia({
  media,
  mediaUrl,
  mediaType,
}: {
  media?: MediaItem[];
  mediaUrl?: string;
  mediaType?: "image" | "video";
}): MediaItem[] | undefined {
  if (Array.isArray(media) && media.length > 0) {
    return media;
  }

  if (mediaUrl && mediaType) {
    return [{ url: mediaUrl, type: mediaType }];
  }

  return undefined;
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
  const media = resolveMedia({
    media: post.media,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
  });
  const primary = media?.[0];

  return {
    id: post.id,
    userId: post.userId,
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
    createdAt: post.createdAt,
    timeAgo: formatPostAge(post.createdAt),
    media,
    mediaUrl: post.mediaUrl ?? primary?.url,
    mediaType: post.mediaType ?? primary?.type,
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
  const media = resolveMedia({
    media: story.media,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
  });
  const primary = media?.[0];

  return {
    id: story.id,
    name: owner?.name.split(" ")[0] ?? "Creator",
    role: owner?.role ?? "Member",
    minutesLeft,
    gradient: story.gradient,
    caption: story.caption,
    seen: currentUserId ? story.seenBy.includes(currentUserId) : false,
    media,
    mediaUrl: story.mediaUrl ?? primary?.url,
    mediaType: story.mediaType ?? primary?.type,
  };
}

export function mapCommentToDto({
  comment,
  usersById,
}: {
  comment: CommentRecord;
  usersById: Map<string, UserRecord>;
}): CommentDto {
  const author = usersById.get(comment.userId);

  return {
    id: comment.id,
    author: author?.name ?? "Unknown Creator",
    handle: author ? `@${author.handle}` : "@unknown",
    avatarGradient:
      author?.avatarGradient ?? "linear-gradient(135deg, #94a3b8, #64748b)",
    text: comment.text,
    createdAt: comment.createdAt,
    time: formatRelativeTime(comment.createdAt),
  };
}
