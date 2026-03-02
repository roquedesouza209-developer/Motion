export type FeedScope = "following" | "discover";
export type PostKind = "Photo" | "Reel";
export type Presence = "Online" | "Away";

export type UserRecord = {
  id: string;
  name: string;
  handle: string;
  role: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  avatarGradient: string;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type PostRecord = {
  id: string;
  userId: string;
  scope: FeedScope;
  kind: PostKind;
  caption: string;
  location: string;
  gradient: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  likedBy: string[];
  savedBy: string[];
  commentCount: number;
  createdAt: string;
};

export type StoryRecord = {
  id: string;
  userId: string;
  caption: string;
  gradient: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  createdAt: string;
  expiresAt: string;
  seenBy: string[];
};

export type ConversationRecord = {
  id: string;
  participantIds: string[];
  unreadCountByUserId: Record<string, number>;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type CommentRecord = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
};

export type FollowRecord = {
  followerId: string;
  followingId: string;
};

export type MotionDb = {
  users: UserRecord[];
  sessions: SessionRecord[];
  posts: PostRecord[];
  comments: CommentRecord[];
  stories: StoryRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  follows: FollowRecord[];
};

export type PublicUser = Pick<
  UserRecord,
  "id" | "name" | "handle" | "role" | "email" | "avatarGradient"
>;

export type PostDto = {
  id: string;
  userId: string;
  author: string;
  handle: string;
  scope: FeedScope;
  kind: PostKind;
  caption: string;
  location: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: number;
  gradient: string;
  createdAt: string;
  timeAgo: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

export type StoryDto = {
  id: string;
  name: string;
  role: string;
  minutesLeft: number;
  gradient: string;
  caption: string;
  seen: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

export type MessageDto = {
  id: string;
  from: "them" | "me";
  text: string;
  createdAt: string;
};

export type ConversationDto = {
  id: string;
  name: string;
  status: Presence;
  unread: number;
  time: string;
  lastMessage: string;
};

export type CommentDto = {
  id: string;
  author: string;
  handle: string;
  avatarGradient: string;
  text: string;
  createdAt: string;
  time: string;
};
