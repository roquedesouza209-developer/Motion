import fs from "node:fs/promises";
import path from "node:path";

import { createPasswordHash } from "@/lib/server/crypto";
import type {
  CommentRecord,
  ConversationRecord,
  FollowRecord,
  MessageRecord,
  MotionDb,
  PostRecord,
  SessionRecord,
  StoryRecord,
  UserRecord,
} from "@/lib/server/types";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DATABASE_PATH = path.join(DATA_DIRECTORY, "motion-db.json");
const DEMO_PASSWORD = "demo12345";

const USER_IDS = {
  demo: "usr_demo",
  lena: "usr_lena",
  ty: "usr_ty",
  ari: "usr_ari",
  mina: "usr_mina",
  noah: "usr_noah",
  kiko: "usr_kiko",
  sora: "usr_sora",
} as const;

let updateQueue: Promise<void> = Promise.resolve();

function toIsoWithMinuteOffset(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function seedUser({
  id,
  name,
  handle,
  role,
  email,
  avatarGradient,
}: {
  id: string;
  name: string;
  handle: string;
  role: string;
  email: string;
  avatarGradient: string;
}): UserRecord {
  const { hash, salt } = createPasswordHash(DEMO_PASSWORD);

  return {
    id,
    name,
    handle,
    role,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    avatarGradient,
    createdAt: toIsoWithMinuteOffset(-120),
  };
}

function createSeedComments(posts: PostRecord[]): CommentRecord[] {
  const knownPostIds = new Set(posts.map((post) => post.id));
  const comments: CommentRecord[] = [];

  const pushComment = (comment: CommentRecord) => {
    if (knownPostIds.has(comment.postId)) {
      comments.push(comment);
    }
  };

  pushComment({
    id: "cmt_501",
    postId: "pst_101",
    userId: USER_IDS.ari,
    text: "Those rooftop highlights are clean. The natural light really worked.",
    createdAt: toIsoWithMinuteOffset(-35),
  });
  pushComment({
    id: "cmt_502",
    postId: "pst_101",
    userId: USER_IDS.mina,
    text: "Love the warmer grade on this set.",
    createdAt: toIsoWithMinuteOffset(-32),
  });
  pushComment({
    id: "cmt_503",
    postId: "pst_102",
    userId: USER_IDS.noah,
    text: "That swipe timing is sharp. The pacing lands.",
    createdAt: toIsoWithMinuteOffset(-24),
  });
  pushComment({
    id: "cmt_504",
    postId: "pst_103",
    userId: USER_IDS.lena,
    text: "The skin tones feel balanced without losing the street mood.",
    createdAt: toIsoWithMinuteOffset(-14),
  });
  pushComment({
    id: "cmt_505",
    postId: "pst_104",
    userId: USER_IDS.demo,
    text: "The BTS framing is strong. The new lens profile looks crisp.",
    createdAt: toIsoWithMinuteOffset(-8),
  });

  return comments;
}

function createSeedDatabase(): MotionDb {
  const users: UserRecord[] = [
    seedUser({
      id: USER_IDS.demo,
      name: "Morgan Otto",
      handle: "morgan.motion",
      role: "Creator",
      email: "demo@motion.app",
      avatarGradient: "linear-gradient(135deg, #ff8f6b, #ff5f6d)",
    }),
    seedUser({
      id: USER_IDS.lena,
      name: "Lena Hart",
      handle: "lensbylena",
      role: "Photographer",
      email: "lena@motion.app",
      avatarGradient: "linear-gradient(135deg, #f6d365, #fda085)",
    }),
    seedUser({
      id: USER_IDS.ty,
      name: "Ty Rivers",
      handle: "tyinmotion",
      role: "Creator",
      email: "ty@motion.app",
      avatarGradient: "linear-gradient(135deg, #96fbc4, #f9f586)",
    }),
    seedUser({
      id: USER_IDS.ari,
      name: "Ari Rowan",
      handle: "ari.rowan",
      role: "Traveler",
      email: "ari@motion.app",
      avatarGradient: "linear-gradient(135deg, #ffc048, #ff6b6b)",
    }),
    seedUser({
      id: USER_IDS.mina,
      name: "Mina Roe",
      handle: "mina.roe",
      role: "Designer",
      email: "mina@motion.app",
      avatarGradient: "linear-gradient(135deg, #ff9a9e, #fbc2eb)",
    }),
    seedUser({
      id: USER_IDS.noah,
      name: "Noah Kim",
      handle: "noah.kim",
      role: "Filmmaker",
      email: "noah@motion.app",
      avatarGradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
    }),
    seedUser({
      id: USER_IDS.kiko,
      name: "Kiko Vale",
      handle: "kiko.studio",
      role: "Photographer",
      email: "kiko@motion.app",
      avatarGradient: "linear-gradient(135deg, #84fab0, #8fd3f4)",
    }),
    seedUser({
      id: USER_IDS.sora,
      name: "Sora Miles",
      handle: "sora.reel",
      role: "Editor",
      email: "sora@motion.app",
      avatarGradient: "linear-gradient(135deg, #fbc2eb, #a6c1ee)",
    }),
  ];

  const posts: PostRecord[] = [
    {
      id: "pst_101",
      userId: USER_IDS.lena,
      scope: "following",
      kind: "Photo",
      caption:
        "Golden-hour session from downtown rooftops. Shot this in one take with natural light only.",
      location: "Seattle, WA",
      gradient: "linear-gradient(145deg, #f6d365, #fda085)",
      likedBy: [USER_IDS.demo, USER_IDS.ari, USER_IDS.ty],
      savedBy: [],
      commentCount: 41,
      createdAt: toIsoWithMinuteOffset(-43),
    },
    {
      id: "pst_102",
      userId: USER_IDS.ty,
      scope: "following",
      kind: "Reel",
      caption: "30-second city run transition edit. Swipe timing was the hardest part.",
      location: "Brooklyn, NY",
      gradient: "linear-gradient(145deg, #96fbc4, #f9f586)",
      likedBy: [USER_IDS.demo, USER_IDS.lena, USER_IDS.mina, USER_IDS.noah],
      savedBy: [],
      commentCount: 63,
      createdAt: toIsoWithMinuteOffset(-30),
    },
    {
      id: "pst_103",
      userId: USER_IDS.kiko,
      scope: "discover",
      kind: "Photo",
      caption: "Street portrait series from this weekend. Testing a warmer grade for skin tones.",
      location: "Austin, TX",
      gradient: "linear-gradient(145deg, #84fab0, #8fd3f4)",
      likedBy: [USER_IDS.lena, USER_IDS.ari],
      savedBy: [],
      commentCount: 29,
      createdAt: toIsoWithMinuteOffset(-19),
    },
    {
      id: "pst_104",
      userId: USER_IDS.sora,
      scope: "discover",
      kind: "Reel",
      caption:
        "Quick behind-the-scenes from a music video setup. New lens profile looks clean.",
      location: "Los Angeles, CA",
      gradient: "linear-gradient(145deg, #fbc2eb, #a6c1ee)",
      likedBy: [USER_IDS.demo, USER_IDS.mina, USER_IDS.noah],
      savedBy: [],
      commentCount: 57,
      createdAt: toIsoWithMinuteOffset(-11),
    },
  ];

  const stories: StoryRecord[] = [
    {
      id: "sty_201",
      userId: USER_IDS.lena,
      caption: "Sunset recce before tonight's shoot.",
      gradient: "linear-gradient(135deg, #ff8f6b, #ff5f6d)",
      createdAt: toIsoWithMinuteOffset(-30),
      expiresAt: toIsoWithMinuteOffset(18),
      seenBy: [USER_IDS.ty],
    },
    {
      id: "sty_202",
      userId: USER_IDS.ty,
      caption: "Drone battery survived all six takes.",
      gradient: "linear-gradient(135deg, #00a3a3, #00b1ff)",
      createdAt: toIsoWithMinuteOffset(-20),
      expiresAt: toIsoWithMinuteOffset(44),
      seenBy: [USER_IDS.demo],
    },
    {
      id: "sty_203",
      userId: USER_IDS.ari,
      caption: "Train station textures are unreal today.",
      gradient: "linear-gradient(135deg, #ffc048, #ff6b6b)",
      createdAt: toIsoWithMinuteOffset(-25),
      expiresAt: toIsoWithMinuteOffset(72),
      seenBy: [],
    },
    {
      id: "sty_204",
      userId: USER_IDS.noah,
      caption: "Lens tests for the next short film.",
      gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
      createdAt: toIsoWithMinuteOffset(-32),
      expiresAt: toIsoWithMinuteOffset(95),
      seenBy: [USER_IDS.demo],
    },
    {
      id: "sty_205",
      userId: USER_IDS.mina,
      caption: "Color cards dialed in for product shots.",
      gradient: "linear-gradient(135deg, #ff9a9e, #fbc2eb)",
      createdAt: toIsoWithMinuteOffset(-40),
      expiresAt: toIsoWithMinuteOffset(113),
      seenBy: [],
    },
  ];

  const conversations: ConversationRecord[] = [
    {
      id: "con_301",
      participantIds: [USER_IDS.demo, USER_IDS.ari],
      unreadCountByUserId: {
        [USER_IDS.demo]: 2,
        [USER_IDS.ari]: 0,
      },
      updatedAt: toIsoWithMinuteOffset(-2),
    },
    {
      id: "con_302",
      participantIds: [USER_IDS.demo, USER_IDS.mina],
      unreadCountByUserId: {
        [USER_IDS.demo]: 0,
        [USER_IDS.mina]: 0,
      },
      updatedAt: toIsoWithMinuteOffset(-27),
    },
    {
      id: "con_303",
      participantIds: [USER_IDS.demo, USER_IDS.noah],
      unreadCountByUserId: {
        [USER_IDS.demo]: 1,
        [USER_IDS.noah]: 0,
      },
      updatedAt: toIsoWithMinuteOffset(-60),
    },
  ];

  const messages: MessageRecord[] = [
    {
      id: "msg_401",
      conversationId: "con_301",
      senderId: USER_IDS.ari,
      text: "Your rooftop reel looked sharp.",
      createdAt: toIsoWithMinuteOffset(-6),
    },
    {
      id: "msg_402",
      conversationId: "con_301",
      senderId: USER_IDS.demo,
      text: "Thanks, I finally fixed the motion blur.",
      createdAt: toIsoWithMinuteOffset(-4),
    },
    {
      id: "msg_403",
      conversationId: "con_301",
      senderId: USER_IDS.ari,
      text: "Can you send the LUT from yesterday?",
      createdAt: toIsoWithMinuteOffset(-2),
    },
    {
      id: "msg_404",
      conversationId: "con_302",
      senderId: USER_IDS.mina,
      text: "Move collab this weekend?",
      createdAt: toIsoWithMinuteOffset(-29),
    },
    {
      id: "msg_405",
      conversationId: "con_302",
      senderId: USER_IDS.demo,
      text: "Yes, Saturday afternoon works for me.",
      createdAt: toIsoWithMinuteOffset(-27),
    },
    {
      id: "msg_406",
      conversationId: "con_303",
      senderId: USER_IDS.demo,
      text: "Did you export the b-roll clips?",
      createdAt: toIsoWithMinuteOffset(-63),
    },
    {
      id: "msg_407",
      conversationId: "con_303",
      senderId: USER_IDS.noah,
      text: "Uploading the raw clips now.",
      createdAt: toIsoWithMinuteOffset(-60),
    },
  ];

  const follows: FollowRecord[] = [
    { followerId: USER_IDS.demo, followingId: USER_IDS.lena },
    { followerId: USER_IDS.demo, followingId: USER_IDS.ty },
    { followerId: USER_IDS.demo, followingId: USER_IDS.ari },
    { followerId: USER_IDS.demo, followingId: USER_IDS.mina },
    { followerId: USER_IDS.demo, followingId: USER_IDS.noah },
    { followerId: USER_IDS.lena, followingId: USER_IDS.ty },
    { followerId: USER_IDS.ty, followingId: USER_IDS.sora },
  ];

  const sessions: SessionRecord[] = [];
  const comments = createSeedComments(posts);

  return {
    users,
    sessions,
    posts,
    comments,
    stories,
    conversations,
    messages,
    follows,
  };
}

function normalizeDatabase(raw: unknown): MotionDb {
  if (!raw || typeof raw !== "object") {
    return createSeedDatabase();
  }

  const candidate = raw as Partial<MotionDb>;
  const normalizeMediaList = (
    media: unknown,
    mediaUrl: unknown,
    mediaType: unknown,
  ): { media?: { url: string; type: "image" | "video" }[]; mediaUrl?: string; mediaType?: "image" | "video" } => {
    const items: { url: string; type: "image" | "video" }[] = [];

    if (Array.isArray(media)) {
      for (const entry of media) {
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const url = (entry as { url?: unknown }).url;
        const type = (entry as { type?: unknown }).type;
        if (
          typeof url === "string" &&
          (type === "image" || type === "video")
        ) {
          items.push({ url, type });
        }
      }
    }

    if (
      items.length === 0 &&
      typeof mediaUrl === "string" &&
      (mediaType === "image" || mediaType === "video")
    ) {
      items.push({ url: mediaUrl, type: mediaType });
    }

    return {
      media: items.length > 0 ? items : undefined,
      mediaUrl: items[0]?.url ?? (typeof mediaUrl === "string" ? mediaUrl : undefined),
      mediaType: items[0]?.type ?? (mediaType === "image" || mediaType === "video" ? mediaType : undefined),
    };
  };
  const normalizedPosts = Array.isArray(candidate.posts)
    ? (candidate.posts as Partial<PostRecord>[]).map((post) => ({
        ...(post as PostRecord),
        ...normalizeMediaList(
          (post as PostRecord).media,
          post.mediaUrl,
          post.mediaType,
        ),
        likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
        savedBy: Array.isArray(post.savedBy) ? post.savedBy : [],
        commentCount: typeof post.commentCount === "number" ? post.commentCount : 0,
      }))
    : [];
  const normalizedComments = Array.isArray(candidate.comments)
    ? (candidate.comments as CommentRecord[])
    : createSeedComments(normalizedPosts);
  const commentTotals = new Map<string, number>();

  normalizedComments.forEach((comment) => {
    commentTotals.set(
      comment.postId,
      (commentTotals.get(comment.postId) ?? 0) + 1,
    );
  });

  return {
    users: Array.isArray(candidate.users) ? (candidate.users as UserRecord[]) : [],
    sessions: Array.isArray(candidate.sessions)
      ? (candidate.sessions as SessionRecord[])
      : [],
    posts: normalizedPosts.map((post) => ({
      ...post,
      commentCount: Math.max(post.commentCount, commentTotals.get(post.id) ?? 0),
    })),
    comments: normalizedComments,
    stories: Array.isArray(candidate.stories)
      ? (candidate.stories as Partial<StoryRecord>[]).map((story) => ({
          ...(story as StoryRecord),
          ...normalizeMediaList(
            (story as StoryRecord).media,
            story.mediaUrl,
            story.mediaType,
          ),
          seenBy: Array.isArray(story.seenBy) ? story.seenBy : [],
        }))
      : [],
    conversations: Array.isArray(candidate.conversations)
      ? (candidate.conversations as ConversationRecord[])
      : [],
    messages: Array.isArray(candidate.messages) ? (candidate.messages as MessageRecord[]) : [],
    follows: Array.isArray(candidate.follows) ? (candidate.follows as FollowRecord[]) : [],
  };
}

function pruneExpiredRecords(db: MotionDb): void {
  const now = Date.now();
  db.sessions = db.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now,
  );
  db.stories = db.stories.filter((story) => new Date(story.expiresAt).getTime() > now);
}

async function ensureDatabaseFile(): Promise<void> {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await fs.access(DATABASE_PATH);
  } catch {
    const seed = createSeedDatabase();
    await writeToDisk(seed);
  }
}

async function readFromDisk(): Promise<MotionDb> {
  await ensureDatabaseFile();

  try {
    const raw = await fs.readFile(DATABASE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeDatabase(parsed);
  } catch {
    const seed = createSeedDatabase();
    await writeToDisk(seed);
    return seed;
  }
}

async function writeToDisk(db: MotionDb): Promise<void> {
  const tempPath = `${DATABASE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempPath, DATABASE_PATH);
}

export async function readDb(): Promise<MotionDb> {
  const db = await readFromDisk();
  pruneExpiredRecords(db);
  return db;
}

export function updateDb<T>(updater: (db: MotionDb) => T | Promise<T>): Promise<T> {
  const task = updateQueue.then(async () => {
    const db = await readFromDisk();
    pruneExpiredRecords(db);
    const result = await updater(db);
    await writeToDisk(db);
    return result;
  });

  updateQueue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

export const seedCredentials = {
  email: "demo@motion.app",
  password: DEMO_PASSWORD,
};
