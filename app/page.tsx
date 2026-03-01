"use client";

import LivePostAge from "@/components/live-post-age";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type FeedView = "following" | "discover";
type ContentView = "posts" | "reels";
type Presence = "Online" | "Away";
type PostKind = "Photo" | "Reel";
type ComposerMode = "post" | "reel" | "story";
type MediaType = "image" | "video";
type ThemeSelection =
  | "system"
  | "light"
  | "dark"
  | "summer"
  | "autumn"
  | "winter"
  | "spring"
  | "ocean"
  | "sunset";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarGradient: string;
};

type Story = {
  id: string;
  name: string;
  caption: string;
  minutesLeft: number;
  gradient: string;
  seen: boolean;
  mediaUrl?: string;
  mediaType?: MediaType;
};

type Post = {
  id: string;
  author: string;
  handle: string;
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
  mediaType?: MediaType;
};

type Conversation = {
  id: string;
  name: string;
  status: Presence;
  unread: number;
  time: string;
  lastMessage: string;
};

type Message = {
  id: string;
  from: "them" | "me";
  text: string;
};

type UploadResponse = {
  mediaUrl: string;
  mediaType: MediaType;
};

type NotificationEntry = {
  id: string;
  title: "New follower" | "Sparked your moment" | "Commented";
  detail: string;
  meta: string;
  tone: "follow" | "like" | "comment";
};

type CommentEntry = {
  id: string;
  author: string;
  handle: string;
  avatarGradient: string;
  text: string;
  createdAt: string;
  time: string;
};

const DEMO_EMAIL = "demo@motion.app";
const DEMO_PASSWORD = "demo12345";
const DEFAULT_POST_LOCATION = "";
const THEME_OPTIONS: { id: ThemeSelection; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "system", label: "System" },
  { id: "summer", label: "Summer" },
  { id: "autumn", label: "Autumn" },
  { id: "winter", label: "Winter" },
  { id: "spring", label: "Spring" },
  { id: "ocean", label: "Ocean" },
  { id: "sunset", label: "Sunset" },
];

function isThemeSelection(input: string | null): input is ThemeSelection {
  return THEME_OPTIONS.some((option) => option.id === input);
}

function sortByNewest<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (init?.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

function MediaPreview({ post, className }: { post: Post; className: string }) {
  if (post.mediaUrl && post.mediaType === "image") {
    return (
      <div className={`${className} relative overflow-hidden`}>
        <Image
          src={post.mediaUrl}
          alt={`${post.author} post`}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  if (post.mediaUrl && post.mediaType === "video") {
    return (
      <video
        src={post.mediaUrl}
        className={`${className} bg-black object-cover`}
        controls
        muted
        preload="metadata"
      />
    );
  }

  return <div className={className} style={{ background: post.gradient }} />;
}

function StoryAvatarContent({ story }: { story: Story }) {
  if (story.mediaUrl && story.mediaType === "image") {
    return (
      <span className="story-avatar overflow-hidden" style={{ background: story.gradient }}>
        <Image
          src={story.mediaUrl}
          alt={`${story.name} story`}
          fill
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span className="story-avatar overflow-hidden" style={{ background: story.gradient }}>
      {story.name.slice(0, 2).toUpperCase()}
      {story.mediaType === "video" ? <span className="story-video-badge">▶</span> : null}
    </span>
  );
}

function SaveGlyph({ saved, className }: { saved: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className ?? "h-4 w-4"}
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

function ThemeGlyph({ theme }: { theme: ThemeSelection }) {
  if (theme === "dark") {
    return (
      <path d="M14.5 2.8a6.8 6.8 0 1 0 2.7 12.9 7.2 7.2 0 1 1-2.7-12.9Z" />
    );
  }

  if (theme === "light") {
    return (
      <>
        <circle cx="10" cy="10" r="3.2" />
        <path d="M10 2.2v2.3M10 15.5v2.3M2.2 10h2.3M15.5 10h2.3M4.5 4.5l1.6 1.6M13.9 13.9l1.6 1.6M4.5 15.5l1.6-1.6M13.9 6.1l1.6-1.6" />
      </>
    );
  }

  if (theme === "summer") {
    return (
      <>
        <circle cx="9" cy="8" r="2.8" />
        <path d="M9 2.5v1.8M9 11.7v1.8M3.5 8H5.3M12.7 8h1.8M5.1 4.1l1.2 1.2M11.7 10.7l1.2 1.2" />
        <path d="M3.2 15.1c1.6-1.4 3.2-1.4 4.8 0s3.2 1.4 4.8 0 3.2-1.4 4.8 0" />
      </>
    );
  }

  if (theme === "system") {
    return (
      <>
        <rect x="2.5" y="3.3" width="15" height="10.7" rx="1.8" />
        <path d="M7.4 17.2h5.2M9 14.9h2" />
      </>
    );
  }

  if (theme === "autumn") {
    return <path d="M10 2.4c2.7 2.6 3.6 6.1 2.5 9-1 2.7-3.7 4.7-6.8 5.1 0-1.8.6-3.5 1.8-4.8 1-1.1 2.4-1.9 4-2.2-2.3-.2-4.4.3-6.1 1.7-.5-3.4 1.2-6.7 4.6-8.8Z" />;
  }

  if (theme === "winter") {
    return (
      <>
        <path d="M10 2.2v15.6M3.2 6.1l13.6 7.8M16.8 6.1 3.2 13.9M6.3 3.6 10 7.3l3.7-3.7M6.3 16.4 10 12.7l3.7 3.7" />
      </>
    );
  }

  if (theme === "spring") {
    return (
      <>
        <circle cx="10" cy="10" r="1.5" />
        <circle cx="10" cy="5.7" r="2.1" />
        <circle cx="14.3" cy="10" r="2.1" />
        <circle cx="10" cy="14.3" r="2.1" />
        <circle cx="5.7" cy="10" r="2.1" />
      </>
    );
  }

  if (theme === "ocean") {
    return <path d="M2.3 11.2c1.8-2 3.3-2 5.1 0s3.3 2 5.1 0 3.3-2 5.1 0M2.3 7.4c1.8-2 3.3-2 5.1 0s3.3 2 5.1 0 3.3-2 5.1 0M2.3 15c1.8-2 3.3-2 5.1 0s3.3 2 5.1 0 3.3-2 5.1 0" />;
  }

  return (
    <>
      <path d="M2.4 13.8h15.2" />
      <path d="M5 13.8a5 5 0 1 1 10 0" />
      <path d="M10 2.6v2.2M4 9.5l1.5 1M16 9.5l-1.5 1" />
    </>
  );
}

function ThemePicker({
  selectedTheme,
  onThemeChange,
}: {
  selectedTheme: ThemeSelection;
  onThemeChange: (theme: ThemeSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeTheme =
    THEME_OPTIONS.find((option) => option.id === selectedTheme) ?? THEME_OPTIONS[0];

  return (
    <div className="theme-picker">
      <button
        type="button"
        className="theme-trigger-button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open theme menu"
        aria-expanded={open}
        title={`Theme: ${activeTheme.label}`}
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
          <ThemeGlyph theme={selectedTheme} />
        </svg>
      </button>
      {open ? (
        <div className="theme-menu motion-surface p-2">
          <div className="theme-strip">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onThemeChange(option.id);
                  setOpen(false);
                }}
                className={`theme-strip-item ${selectedTheme === option.id ? "is-active" : ""}`}
                aria-label={`Switch to ${option.label} theme`}
                title={option.label}
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
                  <ThemeGlyph theme={option.id} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SupportWidget({ defaultEmail }: { defaultEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);

  useEffect(() => {
    setEmail((current) => {
      if (current.trim()) {
        return current;
      }
      return defaultEmail;
    });
  }, [defaultEmail]);

  const submitSupport = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setFeedbackError(false);

    if (!email.trim()) {
      setFeedbackError(true);
      setFeedback("Email is required.");
      return;
    }

    if (!message.trim()) {
      setFeedbackError(true);
      setFeedback("Message is required.");
      return;
    }

    setSubmitting(true);

    try {
      await req<{ ok: boolean }>("/api/support", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          message: message.trim(),
        }),
      });
      setFeedback("Support message sent.");
      setFeedbackError(false);
      setMessage("");
    } catch (error) {
      const details =
        error instanceof Error ? error.message : "Failed to send support message.";
      setFeedback(details);
      setFeedbackError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {open ? (
        <section className="support-panel motion-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Support</p>
            <button
              type="button"
              className="rounded-md border border-[var(--line)] px-2 py-0.5 text-xs"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <form className="space-y-2" onSubmit={submitSupport}>
            <label className="block text-xs font-semibold text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm"
              placeholder="you@example.com"
            />
            <label className="block text-xs font-semibold text-slate-600">Message</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              placeholder="How can we help?"
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-9 w-full rounded-lg bg-[var(--brand)] px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
            {feedback ? (
              <p className={`text-xs ${feedbackError ? "text-red-700" : "text-emerald-700"}`}>
                {feedback}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className="support-fab"
        aria-label="Contact support"
        title="Contact support"
        onClick={() => setOpen((current) => !current)}
      >
        <svg
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 16.7c4.2 0 7.5-2.9 7.5-6.5S14.2 3.8 10 3.8 2.5 6.7 2.5 10.2c0 1.5.6 2.8 1.6 3.9l-.3 2.1 2.5-.6c1 .6 2.3 1.1 3.7 1.1Z" />
          <path d="M7.8 9.1a2.3 2.3 0 0 1 4.4.8c0 1.5-1.6 1.8-1.8 3" />
          <path d="M10.4 14.6h.1" />
        </svg>
      </button>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const feedView: FeedView = "following";
  const [contentView, setContentView] = useState<ContentView>("posts");
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("post");
  const [composerCaption, setComposerCaption] = useState("");
  const [storyCaption, setStoryCaption] = useState("");
  const [composerFile, setComposerFile] = useState<File | null>(null);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyKind, setStoryKind] = useState<PostKind>("Photo");
  const [publishing, setPublishing] = useState(false);
  const [themeSelection, setThemeSelection] = useState<ThemeSelection>("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);
  const [heartBurst, setHeartBurst] = useState<{ postId: string; token: number } | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentEntries, setCommentEntries] = useState<CommentEntry[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const composerCaptionRef = useRef<HTMLTextAreaElement | null>(null);
  const storyCaptionRef = useRef<HTMLTextAreaElement | null>(null);
  const headerActionsRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const feedSectionRef = useRef<HTMLElement | null>(null);
  const heartBurstTimerRef = useRef<number | null>(null);
  const notificationsStorageKey = user
    ? `motion-seen-notifications:${user.id}`
    : null;

  const loadData = async (scope: FeedView) => {
    const [storiesRes, postsRes, savedRes, convoRes] = await Promise.all([
      req<{ stories: Story[] }>("/api/stories"),
      req<{ posts: Post[] }>(`/api/posts?scope=${scope}`),
      req<{ posts: Post[] }>("/api/posts/saved"),
      req<{ conversations: Conversation[] }>("/api/messages/conversations"),
    ]);

    setStories(storiesRes.stories);
    setPosts(postsRes.posts);
    setSavedPosts(savedRes.posts);
    setConversations(convoRes.conversations);
    setActiveId((current) => current ?? convoRes.conversations[0]?.id ?? null);
  };

  useEffect(() => {
    const stored = window.localStorage.getItem("motion-theme");
    if (isThemeSelection(stored)) {
      setThemeSelection(stored);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemPrefersDark(mediaQuery.matches);
    syncSystemTheme();

    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    const resolvedTheme =
      themeSelection === "system"
        ? systemPrefersDark
          ? "dark"
          : "light"
        : themeSelection;

    window.localStorage.setItem("motion-theme", themeSelection);
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [themeSelection, systemPrefersDark]);

  useEffect(() => {
    if (!notificationsStorageKey) {
      setSeenNotificationIds([]);
      return;
    }

    const stored = window.localStorage.getItem(notificationsStorageKey);

    if (!stored) {
      setSeenNotificationIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      setSeenNotificationIds(
        Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === "string")
          : [],
      );
    } catch {
      setSeenNotificationIds([]);
    }
  }, [notificationsStorageKey]);

  useEffect(() => {
    if (!notificationsStorageKey) {
      return;
    }

    window.localStorage.setItem(
      notificationsStorageKey,
      JSON.stringify(seenNotificationIds),
    );
  }, [notificationsStorageKey, seenNotificationIds]);

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      setError(null);

      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" });

        if (me.status === 401) {
          setUser(null);
          return;
        }

        const payload = (await me.json()) as { user: User };
        setUser(payload.user);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setError(null);
    void loadData(feedView).catch((e: unknown) =>
      setError(e instanceof Error ? e.message : "Failed to load data"),
    );
  }, [user, feedView]);

  useEffect(() => {
    if (!user || !activeId) {
      return;
    }

    void req<{ messages: Message[] }>(`/api/messages/${activeId}`)
      .then((payload) => setMessages(payload.messages))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load messages"),
      );
  }, [user, activeId]);

  useEffect(() => {
    if (!composerOpen) {
      return;
    }

    composerCaptionRef.current?.focus();
  }, [composerOpen]);

  useEffect(() => {
    if (!storyComposerOpen) {
      return;
    }

    storyCaptionRef.current?.focus();
  }, [storyComposerOpen]);

  useEffect(() => {
    return () => {
      if (heartBurstTimerRef.current !== null) {
        window.clearTimeout(heartBurstTimerRef.current);
      }
    };
  }, []);

  const sortedPosts = useMemo(() => sortByNewest(posts), [posts]);
  const photoPosts = useMemo(
    () => sortedPosts.filter((post) => post.kind === "Photo"),
    [sortedPosts],
  );
  const reels = useMemo(
    () => sortedPosts.filter((post) => post.kind === "Reel"),
    [sortedPosts],
  );
  const visiblePosts = contentView === "posts" ? photoPosts : reels;
  const notificationItems = useMemo<NotificationEntry[]>(() => {
    const followerName =
      stories.find((story) => story.name !== user?.name.split(" ")[0])?.name ??
      conversations[0]?.name ??
      "Ari Rowan";
    const likeSource =
      photoPosts.find((post) => post.author !== user?.name) ??
      sortedPosts.find((post) => post.author !== user?.name) ??
      null;
    const commentSource =
      reels.find((post) => post.author !== user?.name) ??
      sortedPosts.find((post) => post.author !== user?.name) ??
      null;

    return [
      {
        id: `follow-${followerName}`,
        title: "New follower",
        detail: `${followerName} started following you.`,
        meta: "Just now",
        tone: "follow",
      },
      {
        id: `like-${likeSource?.id ?? "latest"}`,
        title: "Sparked your moment",
        detail: `${
          likeSource?.author ?? "Mina Roe"
        } sparked your latest moment.`,
        meta: likeSource ? `${likeSource.likes} sparks` : "New activity",
        tone: "like",
      },
      {
        id: `comment-${commentSource?.id ?? "latest"}`,
        title: "Commented",
        detail: `${
          commentSource?.author ?? "Noah Kim"
        } commented on your post.`,
        meta: commentSource
          ? `${commentSource.comments} comments`
          : "New comment",
        tone: "comment",
        },
      ];
  }, [conversations, photoPosts, posts, reels, stories, user]);
  const unseenNotificationItems = useMemo(
    () =>
      notificationItems.filter(
        (notification) => !seenNotificationIds.includes(notification.id),
      ),
    [notificationItems, seenNotificationIds],
  );
  const earlierNotificationItems = useMemo(
    () =>
      notificationItems.filter((notification) =>
        seenNotificationIds.includes(notification.id),
      ),
    [notificationItems, seenNotificationIds],
  );
  const notificationCount = unseenNotificationItems.length;
  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );
  const activeCommentsPost = useMemo(
    () => posts.find((post) => post.id === commentsPostId) ?? null,
    [commentsPostId, posts],
  );

  const unread = conversations.reduce((sum, convo) => sum + convo.unread, 0);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    setSeenNotificationIds((current) => {
      if (notificationItems.length === 0) {
        return current;
      }

      const next = new Set(current);

      notificationItems.forEach((notification) => {
        next.add(notification.id);
      });

      if (next.size === current.length) {
        return current;
      }

      return [...next];
    });
  }, [notificationItems, notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen && !profileMenuOpen) {
      return;
    }

    const closeMenus = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        headerActionsRef.current?.contains(target) ||
        profileMenuRef.current?.contains(target)
      ) {
        return;
      }

      setNotificationsOpen(false);
      setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, [notificationsOpen, profileMenuOpen]);

  const openComposer = (mode: ComposerMode = "post") => {
    setError(null);
    setChatOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setCommentsPostId(null);
    setStoryComposerOpen(false);
    setComposerMode(mode);
    if (mode === "story") {
      setStoryKind("Photo");
    }
    setStoryFile(null);
    setComposerOpen(true);
  };

  const openStoryComposer = () => {
    setError(null);
    setChatOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setCommentsPostId(null);
    setComposerOpen(false);
    setStoryKind("Photo");
    setStoryFile(null);
    setStoryComposerOpen(true);
  };

  const openChat = () => {
    setError(null);
    setComposerOpen(false);
    setStoryComposerOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setCommentsPostId(null);
    setActiveId((current) => current ?? conversations[0]?.id ?? null);
    setChatOpen(true);
  };

  const openContentView = (view: ContentView) => {
    setError(null);
    setComposerOpen(false);
    setStoryComposerOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setCommentsPostId(null);
    setChatOpen(false);
    setContentView(view);
    feedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goHome = () => {
    setError(null);
    setComposerOpen(false);
    setStoryComposerOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setCommentsPostId(null);
    setChatOpen(false);
    setContentView("posts");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const payload = await req<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(payload.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  };

  const logout = async () => {
    try {
      await req<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
      setComposerOpen(false);
      setStoryComposerOpen(false);
      setChatOpen(false);
      setNotificationsOpen(false);
      setProfileMenuOpen(false);
      setCommentsPostId(null);
      setUser(null);
      setStories([]);
      setPosts([]);
      setSavedPosts([]);
      setConversations([]);
      setMessages([]);
      setComposerMode("post");
      setComposerCaption("");
      setStoryCaption("");
      setComposerFile(null);
      setStoryFile(null);
      setStoryKind("Photo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign out failed");
    }
  };

  const like = async (postId: string) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post,
      ),
    );

    try {
      const payload = await req<{ liked: boolean; likes: number }>(
        `/api/posts/${postId}/like`,
        { method: "POST" },
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, liked: payload.liked, likes: payload.likes }
            : post,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Like failed");
      await loadData(feedView);
    }
  };

  const closeComments = () => {
    if (commentSubmitting) {
      return;
    }

    setCommentsPostId(null);
    setCommentEntries([]);
    setCommentsTotal(0);
    setCommentDraft("");
    setCommentsError(null);
  };

  const openComments = async (postId: string) => {
    setCommentsPostId(postId);
    setCommentsLoading(true);
    setCommentsError(null);
    setCommentEntries([]);
    setCommentDraft("");

    try {
      const payload = await req<{ comments: CommentEntry[]; total: number }>(
        `/api/posts/${postId}/comments`,
      );
      setCommentEntries(payload.comments);
      setCommentsTotal(payload.total);
    } catch (e) {
      setCommentsError(
        e instanceof Error ? e.message : "Failed to load comments",
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();

    if (!commentsPostId) {
      return;
    }

    const textValue = commentDraft.trim();

    if (!textValue) {
      setCommentsError("Comment cannot be empty.");
      return;
    }

    setCommentSubmitting(true);
    setCommentsError(null);

    try {
      const payload = await req<{ comment: CommentEntry; total: number }>(
        `/api/posts/${commentsPostId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ text: textValue }),
        },
      );

      setCommentEntries((current) => [...current, payload.comment]);
      setCommentsTotal(payload.total);
      setCommentDraft("");
      setPosts((current) =>
        current.map((post) =>
          post.id === commentsPostId
            ? { ...post, comments: payload.total }
            : post,
        ),
      );
    } catch (e) {
      setCommentsError(
        e instanceof Error ? e.message : "Failed to post comment",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const triggerHeartBurst = (postId: string) => {
    const token = Date.now();

    if (heartBurstTimerRef.current !== null) {
      window.clearTimeout(heartBurstTimerRef.current);
    }

    setHeartBurst({ postId, token });
    heartBurstTimerRef.current = window.setTimeout(() => {
      setHeartBurst((current) =>
        current?.postId === postId && current.token === token ? null : current,
      );
      heartBurstTimerRef.current = null;
    }, 720);
  };

  const handlePostDoubleClick = (post: Post) => {
    triggerHeartBurst(post.id);

    if (!post.liked) {
      void like(post.id);
    }
  };

  const toggleSave = async (postId: string) => {
    try {
      await req<{ saved: boolean }>(`/api/posts/${postId}/save`, {
        method: "POST",
      });
      await loadData(feedView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const markSeen = async (storyId: string) => {
    setStories((current) =>
      current.map((story) =>
        story.id === storyId ? { ...story, seen: true } : story,
      ),
    );

    try {
      await req<{ seen: boolean }>(`/api/stories/${storyId}/seen`, { method: "POST" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark story");
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();

    if (!activeId || !text.trim()) {
      return;
    }

    try {
      const message = await req<Message>(`/api/messages/${activeId}`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setMessages((current) => [...current, message]);
      setText("");
      await loadData(feedView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message failed");
    }
  };

  const uploadSelectedMedia = async (
    file: File,
    kind: PostKind,
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    return req<UploadResponse>("/api/media/upload", {
      method: "POST",
      body: formData,
    });
  };

  const createStory = async ({
    caption,
    mediaUrl,
    mediaType,
  }: {
    caption?: string;
    mediaUrl?: string;
    mediaType?: MediaType;
  }) => {
    await req<{ story: Story }>("/api/stories", {
      method: "POST",
      body: JSON.stringify({ caption, mediaUrl, mediaType }),
    });
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();

    if (composerMode !== "story" && !composerCaption.trim()) {
      setError("Caption is required.");
      return;
    }

    if (composerMode === "story" && !composerCaption.trim() && !composerFile) {
      setError("Add a story caption or upload a photo/video.");
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      if (composerMode === "story") {
        const uploaded = composerFile
          ? await uploadSelectedMedia(composerFile, storyKind)
          : null;

        await createStory({
          caption: composerCaption.trim() || undefined,
          mediaUrl: uploaded?.mediaUrl,
          mediaType: uploaded?.mediaType,
        });
        setComposerCaption("");
        setComposerMode("post");
        setComposerFile(null);
        setStoryKind("Photo");
        setComposerOpen(false);
        await loadData(feedView);
        return;
      }

      const postKind: PostKind = composerMode === "reel" ? "Reel" : "Photo";
      let uploaded: UploadResponse | null = null;

      if (composerFile) {
        uploaded = await uploadSelectedMedia(composerFile, postKind);
      }

      await req<{ post: Post }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          caption: composerCaption.trim(),
          kind: postKind,
          location: DEFAULT_POST_LOCATION,
          scope: feedView,
          mediaUrl: uploaded?.mediaUrl,
          mediaType: uploaded?.mediaType,
        }),
      });

      setComposerCaption("");
      setComposerMode("post");
      setComposerFile(null);
      setComposerOpen(false);
      await loadData(feedView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const publishStory = async (event: FormEvent) => {
    event.preventDefault();

    if (!storyCaption.trim() && !storyFile) {
      setError("Upload a photo/video or add a story caption.");
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const uploaded = storyFile
        ? await uploadSelectedMedia(storyFile, storyKind)
        : null;

      await createStory({
        caption: storyCaption.trim() || undefined,
        mediaUrl: uploaded?.mediaUrl,
        mediaType: uploaded?.mediaType,
      });
      setStoryCaption("");
      setStoryFile(null);
      setStoryKind("Photo");
      setStoryComposerOpen(false);
      await loadData(feedView);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Story publish failed");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="motion-shell min-h-screen p-8">
        Loading Motion...
        <SupportWidget defaultEmail="" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="motion-shell min-h-screen p-6">
        <main className="motion-surface mx-auto max-w-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                Motion Sign In
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Backend is live. Use demo credentials or your own account.
              </p>
            </div>
            <ThemePicker
              selectedTheme={themeSelection}
              onThemeChange={setThemeSelection}
            />
          </div>
          <form className="mt-4 space-y-3" onSubmit={login}>
            <input
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <input
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            <button className="h-11 w-full rounded-xl bg-[var(--brand)] font-semibold text-white" type="submit">
              Sign In
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Demo: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </p>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </main>
        <SupportWidget defaultEmail={email} />
      </div>
    );
  }

  return (
    <div className="motion-shell min-h-screen">
      <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-6">
        <header className="motion-surface relative z-50 flex flex-wrap items-center justify-between gap-3 overflow-visible px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--brand)] text-sm font-bold text-white">
              MO
            </div>
            <p className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
              Motion
            </p>
          </div>
          <div className="relative z-40 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => openComposer()}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-white text-lg font-semibold text-slate-700"
              type="button"
              aria-label="Create"
              title="Create"
            >
              +
            </button>
            <div ref={profileMenuRef} className="relative z-40">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  setProfileMenuOpen((current) => !current);
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-xs font-bold text-white"
                style={{ background: user.avatarGradient }}
                aria-label="Open profile menu"
                title="Profile"
              >
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </button>
              {profileMenuOpen ? (
                <div className="motion-surface header-popover min-w-52 p-2">
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">@{user.handle}</p>
                    <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700"
                    type="button"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/profile?tab=saved");
                    }}
                    className="mt-2 flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    type="button"
                  >
                    <span>Vault</span>
                    <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px]">
                      {savedPosts.length}
                    </span>
                  </button>
                  <button
                    onClick={logout}
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <button
          type="button"
          onClick={() => openComposer()}
          className="motion-surface mt-3 flex w-full items-center gap-3 p-3 text-left"
        >
          <div
            className="grid h-11 w-11 place-items-center rounded-full text-xs font-bold text-white"
            style={{ background: user.avatarGradient }}
          >
            {user.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-3 text-sm text-slate-500">
            What&apos;s on your mind?
          </div>
        </button>

        {composerOpen ? (
          <div
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!publishing) {
                setComposerOpen(false);
                setComposerMode("post");
                setComposerFile(null);
                setStoryKind("Photo");
              }
            }}
          >
            <section
              className="motion-surface w-full max-w-xl p-5"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Create"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-xl font-semibold text-slate-900"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Create
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose what you want to publish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false);
                    setComposerMode("post");
                    setComposerFile(null);
                    setStoryKind("Photo");
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
                  aria-label="Close composer"
                  disabled={publishing}
                >
                  x
                </button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={publish}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "post" as const, label: "Post" },
                    { id: "reel" as const, label: "Reel" },
                    { id: "story" as const, label: "Story" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setComposerMode(option.id);
                        setComposerFile(null);
                      }}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        composerMode === option.id
                          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                          : "border-[var(--line)] bg-white text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={composerCaptionRef}
                  value={composerCaption}
                  onChange={(e) => setComposerCaption(e.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                  placeholder={
                    composerMode === "story"
                      ? "Add a story caption (optional)..."
                      : "What&apos;s on your mind?"
                  }
                />

                {composerMode === "story" ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["Photo", "Reel"] as PostKind[]).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => {
                            setStoryKind(kind);
                            setComposerFile(null);
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            storyKind === kind
                              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                              : "border-[var(--line)] bg-white text-slate-700"
                          }`}
                        >
                          {kind === "Photo" ? "Photo Story" : "Reel Story"}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Upload {storyKind === "Photo" ? "Photo" : "Video"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {composerFile ? composerFile.name : "Choose from your device"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept={storyKind === "Photo" ? "image/*" : "video/*"}
                        onChange={(e) => setComposerFile(e.target.files?.[0] ?? null)}
                        className="max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Stories disappear after 24 hours.
                    </p>
                    <div
                      className="mt-3 rounded-2xl px-4 py-5 text-sm font-medium text-white"
                      style={{ background: user.avatarGradient }}
                    >
                      {composerFile
                        ? composerFile.name
                        : composerCaption.trim() || "Upload a photo or reel for your story."}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Add {composerMode === "post" ? "Photo" : "Reel"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {composerFile ? composerFile.name : "Choose a file to upload"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept={composerMode === "post" ? "image/*" : "video/*"}
                        onChange={(e) => setComposerFile(e.target.files?.[0] ?? null)}
                        className="max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                      />
                    </div>
                  </div>
                )}

                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false);
                      setComposerMode("post");
                      setComposerFile(null);
                      setStoryKind("Photo");
                    }}
                    className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
                    disabled={publishing}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={publishing}
                    className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    type="submit"
                  >
                    {publishing
                      ? "Publishing..."
                      : composerMode === "story"
                        ? "Story"
                        : composerMode === "reel"
                          ? "Reel"
                          : "Post"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {storyComposerOpen ? (
          <div
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!publishing) {
                setStoryComposerOpen(false);
                setStoryFile(null);
                setStoryKind("Photo");
              }
            }}
          >
            <section
              className="motion-surface w-full max-w-lg p-5"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Create story"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-xl font-semibold text-slate-900"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Your Story
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    This is a dedicated story composer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStoryComposerOpen(false);
                    setStoryFile(null);
                    setStoryKind("Photo");
                  }}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
                  aria-label="Close story composer"
                  disabled={publishing}
                >
                  x
                </button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={publishStory}>
                <textarea
                  ref={storyCaptionRef}
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                  placeholder="Add a story caption (optional)..."
                />

                <div className="rounded-2xl border border-[var(--line)] bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(["Photo", "Reel"] as PostKind[]).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          setStoryKind(kind);
                          setStoryFile(null);
                        }}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          storyKind === kind
                            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                            : "border-[var(--line)] bg-white text-slate-700"
                        }`}
                      >
                        {kind === "Photo" ? "Photo Story" : "Reel Story"}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Upload {storyKind === "Photo" ? "Photo" : "Video"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {storyFile ? storyFile.name : "Choose from your device"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept={storyKind === "Photo" ? "image/*" : "video/*"}
                      onChange={(e) => setStoryFile(e.target.files?.[0] ?? null)}
                      className="max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">Story Preview</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Quick, temporary, and separate from the main feed.
                  </p>
                  <div
                    className="mt-3 rounded-2xl px-4 py-5 text-sm font-medium text-white"
                    style={{ background: user.avatarGradient }}
                  >
                    {storyFile
                      ? storyFile.name
                      : storyCaption.trim() || "Upload a photo or reel for your story."}
                  </div>
                </div>

                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStoryComposerOpen(false);
                      setStoryFile(null);
                      setStoryKind("Photo");
                    }}
                    className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
                    disabled={publishing}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={publishing}
                    className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    type="submit"
                  >
                    {publishing ? "Publishing..." : "Post Story"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {commentsPostId ? (
          <div
            className="fixed inset-0 z-[92] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
            onClick={closeComments}
          >
            <section
              className="motion-surface w-full max-w-2xl p-5"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Comments"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-xl font-semibold text-slate-900"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Comments
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeCommentsPost
                      ? `${activeCommentsPost.author} · ${commentsTotal} comments`
                      : `${commentsTotal} comments`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeComments}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
                  aria-label="Close comments"
                  disabled={commentSubmitting}
                >
                  x
                </button>
              </div>

              {activeCommentsPost ? (
                <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {activeCommentsPost.author}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {activeCommentsPost.caption}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                {commentsLoading ? (
                  <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
                    Loading comments...
                  </p>
                ) : commentEntries.length > 0 ? (
                  <>
                    {commentEntries.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: comment.avatarGradient }}
                          >
                            {comment.author
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {comment.author}
                              </p>
                              <p className="text-xs text-slate-500">
                                {comment.handle}
                              </p>
                              <p className="text-xs text-slate-500">
                                {comment.time}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {commentsTotal > commentEntries.length ? (
                      <p className="px-1 text-xs text-slate-500">
                        Showing {commentEntries.length} visible comments.{" "}
                        {commentsTotal - commentEntries.length} older comments are not
                        loaded in this preview.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
                    No comments yet. Start the conversation.
                  </p>
                )}
              </div>

              <form onSubmit={submitComment} className="mt-4 space-y-3">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                  placeholder="Write a comment..."
                  maxLength={280}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {commentDraft.trim().length}/280
                    </p>
                    {commentsError ? (
                      <p className="mt-1 text-xs text-red-700">{commentsError}</p>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={commentSubmitting || commentsLoading}
                    className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {commentSubmitting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {error && !composerOpen && !storyComposerOpen && !commentsPostId ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
          <aside className="motion-surface self-start p-4">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-full text-xs font-bold text-white"
                style={{ background: user.avatarGradient }}
              >
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-slate-500">@{user.handle}</p>
              </div>
            </div>
            {["Home", "Reels", "Messages", "Explore"].map((item) => (
              item === "Home" ? (
                <button
                  key={item}
                  type="button"
                  onClick={goHome}
                  className="nav-item mb-2 w-full text-left text-sm"
                  aria-pressed={contentView === "posts" && !chatOpen}
                >
                  {item}
                </button>
              ) : item === "Messages" ? (
                <button
                  key={item}
                  type="button"
                  onClick={openChat}
                  className="nav-item mb-2 w-full text-left text-sm"
                  aria-expanded={chatOpen}
                >
                  {item}
                  {unread > 0 ? ` (${unread})` : ""}
                </button>
              ) : item === "Reels" ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => router.push("/reels")}
                  className="nav-item mb-2 w-full text-left text-sm"
                  aria-label="Open reels page"
                >
                  {item}
                </button>
              ) : item === "Explore" ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => router.push("/explore")}
                  className="nav-item mb-2 w-full text-left text-sm"
                  aria-label="Open explore page"
                >
                  {item}
                </button>
              ) : (
                <div key={item} className="nav-item mb-2 text-sm">
                  {item}
                </div>
              )
            ))}
          </aside>

          <section className="space-y-5">
            <section className="motion-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">Stories</h2>
                <span className="text-xs text-slate-500">Disappear in 24h</span>
              </div>
              <div className="story-strip">
                <button
                  className="story-button is-own-story"
                  onClick={openStoryComposer}
                  type="button"
                >
                  <span className="story-frame">
                    <span className="story-avatar" style={{ background: user.avatarGradient }}>
                      {user.name.slice(0, 2).toUpperCase()}
                      <span className="story-avatar-badge">+</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold">Your Story</span>
                  <span className="text-[11px] text-slate-500">Add now</span>
                </button>
                {stories.map((story) => (
                  <button
                    key={story.id}
                    data-seen={story.seen}
                    onClick={() => void markSeen(story.id)}
                    className="story-button"
                    type="button"
                    title={story.caption || `${story.name}'s story`}
                  >
                    <span className="story-frame">
                      <StoryAvatarContent story={story} />
                    </span>
                    <span className="text-xs font-semibold">{story.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {story.seen ? "Seen" : `${story.minutesLeft}m left`}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section ref={feedSectionRef} className="motion-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex rounded-full border border-[var(--line)] bg-white p-1">
                  <button
                    className={`rounded-full px-3 py-1 text-sm ${
                      contentView === "posts" ? "bg-[var(--brand)] text-white" : ""
                    }`}
                    onClick={() => openContentView("posts")}
                    type="button"
                  >
                    Posts
                  </button>
                  <button
                    className={`rounded-full px-3 py-1 text-sm ${
                      contentView === "reels" ? "bg-[var(--brand)] text-white" : ""
                    }`}
                    onClick={() => openContentView("reels")}
                    type="button"
                  >
                    Reels
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  {visiblePosts.length} {contentView}
                </span>
              </div>

              <div className="space-y-3">
                {visiblePosts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{post.author}</p>
                        <p className="text-xs text-slate-500">
                          {post.location ? `${post.handle} - ${post.location}` : post.handle}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] text-slate-500">
                          <LivePostAge
                            createdAt={post.createdAt}
                            initialLabel={post.timeAgo}
                          />
                        </span>
                        <span className="rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[11px]">
                          {post.kind}
                        </span>
                      </div>
                    </div>
                    <div
                      className="post-media-frame mb-3"
                      onDoubleClick={() => handlePostDoubleClick(post)}
                    >
                      <MediaPreview post={post} className="h-56 w-full rounded-xl" />
                      {heartBurst?.postId === post.id ? (
                        <div key={heartBurst.token} className="like-burst">
                          <svg
                            viewBox="0 0 64 64"
                            className="like-burst-heart"
                            aria-hidden="true"
                          >
                            <path
                              d="M32 55c-1.4 0-2.8-.5-4-1.5C20.7 47.2 8 36.7 8 22.9 8 14.7 14.3 9 22.3 9c4.1 0 8.1 1.8 10.7 4.9C35.6 10.8 39.6 9 43.7 9 51.7 9 58 14.7 58 22.9c0 13.8-12.7 24.3-20 30.6-1.2 1-2.6 1.5-4 1.5Z"
                              fill="#e11d48"
                              stroke="#111111"
                              strokeWidth="4"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-700">{post.caption}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex gap-2">
                        <button
                          onClick={() => void like(post.id)}
                          className={`rounded-full border px-3 py-1 ${
                            post.liked
                              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                              : "border-[var(--line)]"
                          }`}
                          type="button"
                        >
                          Like {post.likes}
                        </button>
                        <button
                          type="button"
                          onClick={() => void openComments(post.id)}
                          className="rounded-full border border-[var(--line)] px-3 py-1"
                        >
                          Comments {post.comments}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleSave(post.id)}
                        className={`grid h-9 w-9 place-items-center rounded-xl border ${
                          post.saved
                            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                            : "border-[var(--line)] bg-white text-slate-600"
                        }`}
                        aria-label={post.saved ? "Remove from saved" : "Save post"}
                        title={post.saved ? "Saved" : "Save"}
                      >
                        <SaveGlyph saved={post.saved} />
                      </button>
                    </div>
                  </article>
                ))}
                {visiblePosts.length === 0 ? (
                  <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-5 text-sm text-slate-500">
                    {contentView === "reels"
                      ? "No reels yet."
                      : "No posts yet."}
                  </p>
                ) : null}
              </div>
            </section>
          </section>

          <aside ref={headerActionsRef} className="space-y-5 self-start xl:sticky xl:top-6">
            <section className="motion-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Theme</p>
                  <p className="text-[11px] text-slate-500">Adjust the look without crowding the header.</p>
                </div>
                <ThemePicker
                  selectedTheme={themeSelection}
                  onThemeChange={setThemeSelection}
                />
              </div>
            </section>

            <section className="motion-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-[11px] text-slate-500">Follows, likes, and comments.</p>
                </div>
                <button
                  className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-700"
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setNotificationsOpen((current) => !current);
                  }}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  title="Notifications"
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
                    <path d="M10 3.1a3.1 3.1 0 0 0-3.1 3.1v1.1c0 .7-.2 1.4-.6 2l-1.1 1.8c-.3.5 0 1.1.6 1.1h8.4c.6 0 .9-.6.6-1.1l-1.1-1.8c-.4-.6-.6-1.3-.6-2V6.2A3.1 3.1 0 0 0 10 3.1Z" />
                    <path d="M8.5 14.7a1.8 1.8 0 0 0 3 0" />
                  </svg>
                  {notificationCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-bold text-white">
                      {notificationCount}
                    </span>
                  ) : null}
                </button>
              </div>

              {notificationsOpen ? (
                <div className="mt-4 space-y-4">
                  {unseenNotificationItems.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          New
                        </p>
                        <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {unseenNotificationItems.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {unseenNotificationItems.map((notification) => (
                          <div
                            key={notification.id}
                            className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      notification.tone === "follow"
                                        ? "bg-sky-100 text-sky-700"
                                        : notification.tone === "like"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {notification.title}
                                  </span>
                                </div>
                                <p className="mt-0.5 break-words text-xs text-slate-500">
                                  {notification.detail}
                                </p>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-500">
                                {notification.meta}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {earlierNotificationItems.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Earlier
                        </p>
                        <span className="text-[10px] text-slate-500">
                          Already viewed
                        </span>
                      </div>
                      <div className="space-y-2">
                        {earlierNotificationItems.map((notification) => (
                          <div
                            key={notification.id}
                            className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2 text-left opacity-60"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      notification.tone === "follow"
                                        ? "bg-sky-100 text-sky-700"
                                        : notification.tone === "like"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {notification.title}
                                  </span>
                                </div>
                                <p className="mt-0.5 break-words text-xs text-slate-500">
                                  {notification.detail}
                                </p>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-500">
                                {notification.meta}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {notificationItems.length === 0 ? (
                    <p className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs text-slate-500">
                      No notifications right now.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs text-slate-500">
                  Keep this closed until you need it. The feed stays central and easier to scan.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>
      {chatOpen ? (
        <section className="chat-panel motion-surface p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
              <div className="pulse-dot" />
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
            >
              Close
            </button>
          </div>
          <div className="chat-scroll space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
                  activeId === conversation.id
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--line)] bg-white"
                }`}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{conversation.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {conversation.lastMessage}
                  </span>
                </span>
                <span className="ml-3 text-right text-xs text-slate-500">
                  {conversation.unread > 0 ? conversation.unread : conversation.time}
                </span>
              </button>
            ))}
          </div>
          {activeId ? (
            <div className="mt-3 rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {activeConversation?.name ?? "Conversation"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {activeConversation?.status ?? "Active now"}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  {activeConversation?.time ?? ""}
                </span>
              </div>
              <div className="chat-thread space-y-2">
                {messages.map((message) => (
                  <p
                    key={message.id}
                    className={`w-fit max-w-[92%] rounded-xl px-3 py-2 text-xs ${
                      message.from === "me"
                        ? "ml-auto bg-[var(--brand)] text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {message.text}
                  </p>
                ))}
              </div>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 text-xs"
                  placeholder="Send a message..."
                />
                <button
                  className="h-9 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white"
                  type="submit"
                >
                  Send
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}
      <button
        type="button"
        className="chat-fab"
        onClick={() => {
          if (chatOpen) {
            setChatOpen(false);
            return;
          }

          openChat();
        }}
        aria-label="Open messages"
        aria-expanded={chatOpen}
        title="Messages"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.1 4.7A1.6 1.6 0 0 1 4.7 3.1h10.6a1.6 1.6 0 0 1 1.6 1.6v7.2a1.6 1.6 0 0 1-1.6 1.6H8.8L5.1 16v-2.5H4.7a1.6 1.6 0 0 1-1.6-1.6Z" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--brand)]">
            {unread}
          </span>
        ) : null}
      </button>
      <SupportWidget defaultEmail={user.email} />
    </div>
  );
}
