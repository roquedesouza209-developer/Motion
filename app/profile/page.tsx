"use client";

import FollowListModal from "@/components/profile/follow-list-modal";
import DeleteAccountModal from "@/components/profile/delete-account-modal";
import EditProfileModal from "@/components/profile/edit-profile-modal";
import ProfileHero from "@/components/profile/profile-hero";
import ProfileMediaGrid from "@/components/profile/profile-media-grid";
import PrivacySettingsModal from "@/components/profile/privacy-settings-modal";
import TimeCapsuleModal from "@/components/profile/time-capsule-modal";
import type { InterestKey } from "@/lib/interests";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MediaType = "image" | "video";
type ProfileTab = "posts" | "saved" | "tagged" | "archive" | "bin";
type FeedVisibility = "everyone" | "followers" | "non_followers" | "custom";
type AccountType = "public" | "creator";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  role?: string;
  accountType?: AccountType;
  avatarGradient: string;
  avatarUrl?: string;
  bio?: string;
  interests?: InterestKey[];
  feedVisibility?: FeedVisibility;
  hiddenFromIds?: string[];
};

type Post = {
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
  visibleAt?: string;
  deletedAt?: string;
  archivedAt?: string;
};

type FollowUser = {
  id: string;
  name: string;
  handle: string;
  accountType?: AccountType;
  avatarUrl?: string;
  avatarGradient: string;
};

function parseStoredOrder(input: string | null): string[] {
  if (!input) {
    return [];
  }

  try {
    const parsed = JSON.parse(input) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function syncOrder(
  items: Post[],
  order: string[],
  options?: { appendMissingToEnd?: boolean },
): string[] {
  if (items.length === 0) {
    return [];
  }

  const itemIds = new Set(items.map((item) => item.id));
  const filtered = order.filter((id) => itemIds.has(id));
  const missing = items.map((item) => item.id).filter((id) => !filtered.includes(id));
  if (options?.appendMissingToEnd) {
    return [...filtered, ...missing];
  }
  return [...missing, ...filtered];
}

function applyOrder(items: Post[], order: string[]): Post[] {
  if (order.length === 0) {
    return items;
  }

  const indexById = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aIndex = indexById.get(a.id);
    const bIndex = indexById.get(b.id);

    if (aIndex === undefined && bIndex === undefined) {
      return 0;
    }

    if (aIndex === undefined) {
      return 1;
    }

    if (bIndex === undefined) {
      return -1;
    }

    return aIndex - bIndex;
  });
}

function isPostOwnedBy(post: Post, userId?: string | null): boolean {
  if (!userId) {
    return false;
  }
  if (post.userId === userId) {
    return true;
  }
  return Boolean(post.coAuthors?.some((coAuthor) => coAuthor.id === userId));
}

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "saved", label: "Vault" },
  { id: "tagged", label: "Tagged" },
  { id: "archive", label: "Archive" },
  { id: "bin", label: "Bin" },
];

const ACCOUNTS_STORAGE_KEY = "motion-accounts";
const LAST_ACCOUNT_KEY = "motion-last-account";
const POST_ORDER_STORAGE_KEY = "motion-post-order";
const PINNED_STORAGE_KEY = "motion-post-pins";
const BIN_RETENTION_DAYS = 30;
const BIN_RETENTION_MS = BIN_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const EMPTY_LAYOUT: { order: string[]; pinned: string[] } = {
  order: [],
  pinned: [],
};

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload;
}



function getBinMsLeft(deletedAt?: string): number | null {
  if (!deletedAt) {
    return null;
  }

  const removedAt = new Date(deletedAt).getTime();
  if (Number.isNaN(removedAt)) {
    return null;
  }

  return BIN_RETENTION_MS - (Date.now() - removedAt);
}

function isBinExpired(deletedAt?: string): boolean {
  const msLeft = getBinMsLeft(deletedAt);
  return msLeft !== null && msLeft <= 0;
}

function toDateTimeLocalValue(input: string | number | Date): string {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatCapsuleDate(input: string | number | Date): string {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return "your chosen date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeProfileTab(input: string | null): ProfileTab {
  if (input === "saved" || input === "tagged" || input === "archive" || input === "bin") {
    return input;
  }

  return "posts";
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedHandle = searchParams.get("user");
  const [user, setUser] = useState<User | null>(null);
  const [profileOwner, setProfileOwner] = useState<User | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [binPosts, setBinPosts] = useState<Post[]>([]);
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [postOrder, setPostOrder] = useState<string[]>([]);
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>([]);
  const [viewedPostOrder, setViewedPostOrder] = useState<string[]>([]);
  const [viewedPinnedPostIds, setViewedPinnedPostIds] = useState<string[]>([]);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capsuleNotice, setCapsuleNotice] = useState<string | null>(null);
  const [capsuleEditorPost, setCapsuleEditorPost] = useState<Post | null>(null);
  const [capsuleValue, setCapsuleValue] = useState("");
  const [capsuleSaving, setCapsuleSaving] = useState(false);
  const [capsuleActionId, setCapsuleActionId] = useState<string | null>(null);
  const [capsuleError, setCapsuleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editAvatarUploading, setEditAvatarUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [followStats, setFollowStats] = useState({
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [followListOpen, setFollowListOpen] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [followActionId, setFollowActionId] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [editAccountType, setEditAccountType] = useState<AccountType>("public");
  const [editVisibility, setEditVisibility] = useState<FeedVisibility>("everyone");
  const [editHiddenIds, setEditHiddenIds] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<InterestKey[]>([]);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; name: string; handle: string; avatarUrl?: string; avatarGradient: string }[]>([]);

  useEffect(() => {
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(normalizeProfileTab(params.get("tab")));
    };

    syncTabFromUrl();
    window.addEventListener("popstate", syncTabFromUrl);

    return () => window.removeEventListener("popstate", syncTabFromUrl);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setLayoutReady(false);

      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        let currentUser: User | null = null;

        if (meRes.status === 401) {
          if (!requestedHandle) {
            router.replace("/");
            return;
          }
        } else {
          const mePayload = (await meRes.json()) as { user?: User; error?: string };
          if (!meRes.ok || !mePayload.user) {
            throw new Error(mePayload.error ?? "Failed to load profile.");
          }
          currentUser = mePayload.user;
        }

        setUser(currentUser);
        const isSelfView = Boolean(
          currentUser &&
          (
            !requestedHandle ||
            requestedHandle.toLowerCase() === currentUser.handle.toLowerCase()
          ),
        );
        if (!isSelfView) {
          setLayoutEditMode(false);
        }

        const [following, discover, saved, binReq, archiveReq, scheduledReq, layoutReq] = await Promise.all([
          apiGet<{ posts: Post[] }>("/api/posts?scope=following"),
          apiGet<{ posts: Post[] }>("/api/posts?scope=discover"),
          currentUser && isSelfView
            ? apiGet<{ posts: Post[] }>("/api/posts/saved")
            : Promise.resolve({ posts: [] }),
          currentUser && isSelfView
            ? apiGet<{ posts: Post[] }>("/api/posts?scope=bin")
            : Promise.resolve({ posts: [] }),
          currentUser && isSelfView
            ? apiGet<{ posts: Post[] }>("/api/posts?scope=archive")
            : Promise.resolve({ posts: [] }),
          currentUser && isSelfView
            ? apiGet<{ posts: Post[] }>("/api/posts?scope=scheduled")
            : Promise.resolve({ posts: [] }),
          currentUser && isSelfView
            ? apiGet<{ order: string[]; pinned: string[] }>("/api/profile/layout")
                .catch(() => EMPTY_LAYOUT)
            : Promise.resolve(EMPTY_LAYOUT),
        ]);

        const deduped = new Map<string, Post>();

        [...following.posts, ...discover.posts].forEach((post) => {
          if (!deduped.has(post.id)) {
            deduped.set(post.id, post);
          }
        });

        const all = [...deduped.values()];
        setAllPosts(all);

        if (currentUser) {
          const ownVisiblePosts = [...deduped.values()].filter(
            (post) => isPostOwnedBy(post, currentUser.id),
          );
          const ownPostsMap = new Map<string, Post>();

          ownVisiblePosts.forEach((post) => {
            ownPostsMap.set(post.id, post);
          });

          scheduledReq.posts.forEach((post) => {
            ownPostsMap.set(post.id, post);
          });

          const ownPosts = [...ownPostsMap.values()].filter(
            (post) => !post.deletedAt && !post.archivedAt,
          );
          const storedOrder = parseStoredOrder(
            window.localStorage.getItem(`${POST_ORDER_STORAGE_KEY}:${currentUser.id}`),
          );
          const storedPins = parseStoredOrder(
            window.localStorage.getItem(`${PINNED_STORAGE_KEY}:${currentUser.id}`),
          );
          const layoutOrder = layoutReq.order.length > 0 ? layoutReq.order : storedOrder;
          const layoutPins = layoutReq.pinned.length > 0 ? layoutReq.pinned : storedPins;
          const nextOrder = syncOrder(ownPosts, layoutOrder, {
            appendMissingToEnd: layoutOrder.length > 0,
          });
          const ownPostIds = new Set(ownPosts.map((post) => post.id));
          const validPins = layoutPins.filter((id) => ownPostIds.has(id));

          setPostOrder(nextOrder);
          setPinnedPostIds(validPins);
          setPosts(applyOrder(ownPosts, nextOrder));
          setSavedPosts(saved.posts);
          setBinPosts(binReq.posts);
          setArchivePosts(archiveReq.posts);
        } else {
          setPostOrder([]);
          setPinnedPostIds([]);
          setPosts([]);
          setSavedPosts([]);
          setBinPosts([]);
          setArchivePosts([]);
        }

        if (requestedHandle && requestedHandle !== currentUser?.handle) {
          try {
            const usersRes = await apiGet<{
              users: {
                id: string;
                name: string;
                handle: string;
                accountType?: AccountType;
                avatarUrl?: string;
                avatarGradient: string;
              }[];
            }>(`/api/users?q=${requestedHandle}`);
            const match = usersRes.users.find(
              (candidate) =>
                candidate.handle.toLowerCase() === requestedHandle.toLowerCase(),
            );

            if (match) {
              setProfileOwner({
                id: match.id,
                name: match.name,
                handle: match.handle,
                email: "",
                accountType: match.accountType,
                avatarGradient: match.avatarGradient,
                avatarUrl: match.avatarUrl,
              });
              setActiveTab("posts");
              if (currentUser) {
                void fetch("/api/profile/views", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ viewedId: match.id }),
                });
              }
            } else {
              setProfileOwner(currentUser);
            }
          } catch {
            setProfileOwner(currentUser);
          }
        } else {
          setProfileOwner(currentUser);
        }
        setLayoutReady(true);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router, requestedHandle]);

  const profileOwnerKey = profileOwner?.id || profileOwner?.handle || "";
  const profileOwnerId = profileOwner?.id || profileOwner?.handle || "";
  const isViewingSelf = profileOwner?.id === user?.id;

  useEffect(() => {
    if (!profileOwner || !profileOwnerKey) {
      return;
    }

    const loadStats = async () => {
      try {
        const payload = await apiGet<{
          followerCount: number;
          followingCount: number;
          isFollowing: boolean;
        }>(`/api/follows?userId=${encodeURIComponent(profileOwnerKey)}`);
        setFollowStats({
          followerCount: payload.followerCount,
          followingCount: payload.followingCount,
          isFollowing: payload.isFollowing,
        });
      } catch (statsError) {
        setFollowError(
          statsError instanceof Error ? statsError.message : "Failed to load follow stats.",
        );
      }
    };

    void loadStats();
  }, [profileOwnerKey, profileOwner, user]);

  useEffect(() => {
    if (!profileOwner || isViewingSelf) {
      setViewedPostOrder([]);
      setViewedPinnedPostIds([]);
      return;
    }

    let active = true;

    const loadLayout = async () => {
      try {
        const payload = await apiGet<{ order: string[]; pinned: string[] }>(
          `/api/profile/layout?user=${encodeURIComponent(profileOwnerId)}`,
        );
        if (!active) {
          return;
        }
        const ownerPosts = allPosts.filter((post) => isPostOwnedBy(post, profileOwner.id));
        const nextOrder = syncOrder(ownerPosts, payload.order, {
          appendMissingToEnd: payload.order.length > 0,
        });
        const ownerPostIds = new Set(ownerPosts.map((post) => post.id));
        const nextPins = payload.pinned.filter((id) => ownerPostIds.has(id));
        setViewedPostOrder(nextOrder);
        setViewedPinnedPostIds(nextPins);
      } catch {
        if (!active) {
          return;
        }
        setViewedPostOrder([]);
        setViewedPinnedPostIds([]);
      }
    };

    void loadLayout();

    return () => {
      active = false;
    };
  }, [allPosts, isViewingSelf, profileOwner, profileOwnerId]);

  const taggedPosts = useMemo(() => {
    if (!profileOwner) {
      return [] as Post[];
    }

    const handleTag = profileOwner.handle.toLowerCase();
    const nameTag = profileOwner.name.toLowerCase();

    return allPosts.filter(
      (post) =>
        post.author !== profileOwner.name &&
        (
          post.caption.toLowerCase().includes(`@${handleTag}`) ||
          post.caption.toLowerCase().includes(nameTag)
        ),
    );
  }, [allPosts, profileOwner]);

  const pinnedSet = useMemo(() => new Set(pinnedPostIds), [pinnedPostIds]);
  const currentAccountType = user?.accountType ?? "public";
  const effectiveAccountType =
    currentAccountType === "creator" ? "creator" : editAccountType;
  const displayPinnedSet = useMemo(
    () => new Set(isViewingSelf ? pinnedPostIds : viewedPinnedPostIds),
    [isViewingSelf, pinnedPostIds, viewedPinnedPostIds],
  );
  const profilePosts = useMemo(() => {
    if (!profileOwner) {
      return [] as Post[];
    }

    if (isViewingSelf) {
      return posts;
    }

    const ownerPosts = allPosts.filter((post) => isPostOwnedBy(post, profileOwner.id));
    if (viewedPostOrder.length > 0) {
      return applyOrder(ownerPosts, viewedPostOrder);
    }
    return ownerPosts;
  }, [allPosts, isViewingSelf, posts, profileOwner, viewedPostOrder]);

  const binVisiblePosts = useMemo(
    () => binPosts.filter((post) => !isBinExpired(post.deletedAt)),
    [binPosts],
  );
  const visiblePosts = isViewingSelf
    ? activeTab === "saved"
      ? savedPosts
      : activeTab === "tagged"
        ? taggedPosts
        : activeTab === "archive"
          ? archivePosts
        : activeTab === "bin"
          ? binVisiblePosts
          : posts
    : profilePosts;
  const canReorder = isViewingSelf && activeTab === "posts" && layoutEditMode;
  const capsuleMinValue = toDateTimeLocalValue(Date.now() + 60_000);

  const updatePostItems = (
    items: Post[],
    updatedPost: Post,
    options?: { addIfMissing?: boolean; addToFront?: boolean },
  ) => {
    let found = false;
    const nextItems = items.map((item) => {
      if (item.id !== updatedPost.id) {
        return item;
      }

      found = true;
      return { ...item, ...updatedPost };
    });

    if (found || !options?.addIfMissing) {
      return nextItems;
    }

    if (options.addToFront) {
      return [updatedPost, ...nextItems];
    }

    return [...nextItems, updatedPost];
  };

  const openCapsuleEditor = (post: Post) => {
    if (!isViewingSelf || post.userId !== user?.id) {
      return;
    }

    setCapsuleEditorPost(post);
    setCapsuleValue(toDateTimeLocalValue(post.visibleAt ?? Date.now() + 60_000));
    setCapsuleError(null);
    setError(null);
    setCapsuleNotice(null);
  };

  const closeCapsuleEditor = () => {
    if (capsuleSaving) {
      return;
    }

    setCapsuleEditorPost(null);
    setCapsuleValue("");
    setCapsuleError(null);
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    window.localStorage.setItem(
      `${POST_ORDER_STORAGE_KEY}:${user.id}`,
      JSON.stringify(postOrder),
    );
    window.localStorage.setItem(
      `${PINNED_STORAGE_KEY}:${user.id}`,
      JSON.stringify(pinnedPostIds),
    );
  }, [pinnedPostIds, postOrder, user]);

  useEffect(() => {
    if (!user || !layoutReady || !isViewingSelf) {
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        await fetch("/api/profile/layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: postOrder, pinned: pinnedPostIds }),
        });
      } catch {
        // Ignore save errors.
      }
    }, 600);

    return () => window.clearTimeout(handle);
  }, [isViewingSelf, layoutReady, pinnedPostIds, postOrder, user]);

  const selectTab = (tab: ProfileTab) => {
    if (!isViewingSelf && tab !== "posts") {
      return;
    }
    setActiveTab(tab);
    if (isViewingSelf) {
      router.replace(tab === "posts" ? "/profile" : `/profile?tab=${tab}`, {
        scroll: false,
      });
    }
  };

  const toggleFollow = async () => {
    if (!profileOwner || isViewingSelf) {
      return;
    }
    if (!user) {
      router.push("/");
      return;
    }

    setFollowLoading(true);
    setFollowError(null);

    try {
      if (!profileOwnerKey) {
        throw new Error("User is required.");
      }

      const response = await fetch(`/api/follows/${encodeURIComponent(profileOwnerKey)}`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        following?: boolean;
        followerCount?: number;
        followingCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to follow user.");
      }

      setFollowStats((current) => ({
        followerCount: payload.followerCount ?? current.followerCount,
        followingCount: payload.followingCount ?? current.followingCount,
        isFollowing: Boolean(payload.following),
      }));
    } catch (followErr) {
      setFollowError(
        followErr instanceof Error ? followErr.message : "Failed to follow user.",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowList = async (listType: "followers" | "following") => {
    if (!profileOwner) {
      return;
    }

    setFollowListOpen(listType);
    setFollowLoading(true);
    setFollowError(null);
    setFollowActionId(null);

    try {
      if (!profileOwnerKey) {
        throw new Error("User is required.");
      }

      const payload = await apiGet<{
        users: FollowUser[];
        followerCount: number;
        followingCount: number;
        isFollowing: boolean;
      }>(`/api/follows?userId=${encodeURIComponent(profileOwnerKey)}&list=${listType}`);
      setFollowList(payload.users ?? []);
      setFollowStats((current) => ({
        followerCount: payload.followerCount ?? current.followerCount,
        followingCount: payload.followingCount ?? current.followingCount,
        isFollowing:
          typeof payload.isFollowing === "boolean"
            ? payload.isFollowing
            : current.isFollowing,
      }));
    } catch (listError) {
      setFollowError(
        listError instanceof Error ? listError.message : "Failed to load list.",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const unfollowFromList = async (target: FollowUser) => {
    const targetKey = target.id || target.handle;
    setFollowActionId(targetKey || null);
    setFollowError(null);

    try {
      if (!targetKey) {
        throw new Error("User is required.");
      }

      const response = await fetch(`/api/follows/${encodeURIComponent(targetKey)}`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        following?: boolean;
        followerCount?: number;
        followingCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update follow.");
      }

      if (payload.following === false) {
        setFollowList((current) =>
          current.filter(
            (item) => item.id !== target.id && item.handle !== target.handle,
          ),
        );
      }

      setFollowStats((current) => {
        if (isViewingSelf && followListOpen === "following" && payload.following === false) {
          return {
            ...current,
            followingCount: Math.max(0, current.followingCount - 1),
          };
        }
        return {
          followerCount: payload.followerCount ?? current.followerCount,
          followingCount: payload.followingCount ?? current.followingCount,
          isFollowing: current.isFollowing,
        };
      });
    } catch (followErr) {
      setFollowError(
        followErr instanceof Error ? followErr.message : "Failed to update follow.",
      );
    } finally {
      setFollowActionId(null);
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError(null);

    try {
      const response = await fetch("/api/auth/delete", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete account.");
      }

      const stored = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { handle?: string; email?: string }[];
          const filtered = Array.isArray(parsed)
            ? parsed.filter((account) => {
              if (user.handle) {
                if (account.handle) {
                  return account.handle !== user.handle;
                }
                return true;
              }
              return account.email?.toLowerCase() !== user.email.toLowerCase();
            })
            : [];
          window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
        } catch {
          // Ignore storage errors.
        }
      }

      const lastKey = window.localStorage.getItem(LAST_ACCOUNT_KEY);
      if (lastKey && (lastKey === user.handle || lastKey === user.email)) {
        window.localStorage.removeItem(LAST_ACCOUNT_KEY);
      }

      router.replace("/");
    } catch (deleteError) {
      setDeleteAccountError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete account.",
      );
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleDragStart = (postId: string) => (event: React.DragEvent<HTMLElement>) => {
    if (!canReorder) {
      return;
    }
    if (pinnedSet.has(postId)) {
      return;
    }

    setDraggingId(postId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", postId);
  };

  const handleDragOver = (postId: string) => (event: React.DragEvent<HTMLElement>) => {
    if (!canReorder) {
      return;
    }
    if (pinnedSet.has(postId)) {
      setDragOverId(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(postId);
  };

  const handleDrop = (postId: string) => (event: React.DragEvent<HTMLElement>) => {
    if (!canReorder) {
      return;
    }

    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain") || draggingId;

    if (!draggedId || draggedId === postId) {
      return;
    }
    if (pinnedSet.has(draggedId) || pinnedSet.has(postId)) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    setPosts((current) => {
      const next = [...current];
      const fromIndex = next.findIndex((post) => post.id === draggedId);
      const toIndex = next.findIndex((post) => post.id === postId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      const crossesPinned = next
        .slice(start, end + 1)
        .some((post) => pinnedSet.has(post.id));
      if (crossesPinned) {
        return current;
      }

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setPostOrder(next.map((post) => post.id));
      return next;
    });

    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };
  const togglePin = (postId: string) => {
    if (!isViewingSelf || !layoutEditMode || activeTab !== "posts") {
      return;
    }

    setPinnedPostIds((current) => {
      if (current.includes(postId)) {
        return current.filter((id) => id !== postId);
      }
      return [...current, postId];
    });
    setPostOrder((current) =>
      current.includes(postId) ? current : [...current, postId],
    );
  };

  const toggleSave = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        saved?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to vault post.");
      }

      const update = (items: Post[]) =>
        items.map((post) =>
          post.id === postId ? { ...post, saved: Boolean(payload.saved) } : post,
        );

      setPosts((current) => update(current));
      setAllPosts((current) => update(current));
      setSavedPosts((current) => {
        const updated = update(current);

        if (!payload.saved) {
          return updated.filter((post) => post.id !== postId);
        }

        const sourcePost =
          allPosts.find((post) => post.id === postId) ??
          posts.find((post) => post.id === postId) ??
          savedPosts.find((post) => post.id === postId);

        if (sourcePost && !updated.some((post) => post.id === postId)) {
          return [{ ...sourcePost, saved: true }, ...updated];
        }

        return updated;
      });
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "Failed to vault post.",
      );
    }
  };

  const deletePost = async (postId: string) => {
    if (deletingId) {
      return;
    }

    setDeletingId(postId);
    setError(null);

    try {
      // If we're already in the bin tab, force delete
      const url = activeTab === "bin" ? `/api/posts/${postId}?force=true` : `/api/posts/${postId}`;
      const response = await fetch(url, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete post.");
      }

        if (activeTab === "bin") {
          setBinPosts((current) => current.filter((post) => post.id !== postId));
        } else {
          const deletedPost = posts.find((p) => p.id === postId) || allPosts.find((p) => p.id === postId);

        if (deletedPost) {
          setBinPosts((current) => [{ ...deletedPost, deletedAt: new Date().toISOString() }, ...current]);
        }

          setPosts((current) => current.filter((post) => post.id !== postId));
          setAllPosts((current) => current.filter((post) => post.id !== postId));
          setSavedPosts((current) => current.filter((post) => post.id !== postId));
        }
        setPostOrder((current) => current.filter((id) => id !== postId));
        setPinnedPostIds((current) => current.filter((id) => id !== postId));
      } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete post.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const archivePost = async (postId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/archive`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to archive post.");
      }

      const archivedPost =
        posts.find((p) => p.id === postId) || allPosts.find((p) => p.id === postId);

      if (archivedPost) {
        const nextArchived = { ...archivedPost, archivedAt: new Date().toISOString() };
        setArchivePosts((current) => [nextArchived, ...current]);
      }

      setPosts((current) => current.filter((post) => post.id !== postId));
      setAllPosts((current) => current.filter((post) => post.id !== postId));
      setSavedPosts((current) => current.filter((post) => post.id !== postId));
      setPostOrder((current) => current.filter((id) => id !== postId));
      setPinnedPostIds((current) => current.filter((id) => id !== postId));
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Failed to archive post.",
      );
    }
  };

  const unarchivePost = async (postId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/archive`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to restore post.");
      }

      const archivedPost = archivePosts.find((p) => p.id === postId);

      if (archivedPost) {
        const restored = { ...archivedPost, archivedAt: undefined };
        setPosts((current) => [restored, ...current]);
        setAllPosts((current) => [restored, ...current]);
        setPostOrder((current) => [postId, ...current.filter((id) => id !== postId)]);
      }

      setArchivePosts((current) => current.filter((post) => post.id !== postId));
    } catch (restoreError) {
      setError(
        restoreError instanceof Error ? restoreError.message : "Failed to restore post.",
      );
    }
  };

  const withdrawCollabInvite = async (postId: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/collab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to withdraw invite.");
      }

      const clearInvite = (items: Post[]) =>
        items.map((post) =>
          post.id === postId ? { ...post, collabInvites: [] } : post,
        );
      setPosts((current) => clearInvite(current));
      setAllPosts((current) => clearInvite(current));
      setArchivePosts((current) => clearInvite(current));
      setBinPosts((current) => clearInvite(current));
    } catch (withdrawError) {
      setError(
        withdrawError instanceof Error ? withdrawError.message : "Failed to withdraw invite.",
      );
    }
  };

  const restorePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/restore`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to restore post.");
      }

      const postToRestore = binPosts.find((p) => p.id === postId);

      if (postToRestore) {
        const restored = { ...postToRestore, deletedAt: undefined };
        setPosts((current) => [restored, ...current]);
        setAllPosts((current) => [restored, ...current]);
        setPostOrder((current) => [postId, ...current.filter((id) => id !== postId)]);
      }

      setBinPosts((current) => current.filter((post) => post.id !== postId));
    } catch (restoreError) {
      setError(
        restoreError instanceof Error ? restoreError.message : "Failed to restore post.",
      );
    }
  };

  const saveCapsuleSchedule = async () => {
    if (!capsuleEditorPost) {
      return;
    }

    const releaseAt = new Date(capsuleValue).getTime();

    if (!capsuleValue || Number.isNaN(releaseAt)) {
      setCapsuleError("Choose a valid future date.");
      return;
    }

    if (releaseAt <= Date.now()) {
      setCapsuleError("Time capsule posts must open in the future.");
      return;
    }

    setCapsuleSaving(true);
    setCapsuleError(null);
    setError(null);
    setCapsuleNotice(null);

    try {
      const response = await fetch(`/api/posts/${capsuleEditorPost.id}/capsule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleAt: new Date(releaseAt).toISOString() }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        post?: Post;
        error?: string;
      };

      if (!response.ok || !payload.post) {
        throw new Error(payload.error ?? "Failed to reschedule time capsule.");
      }

      const updatedPost = payload.post;
      setPosts((current) => updatePostItems(current, updatedPost));
      setAllPosts((current) => updatePostItems(current, updatedPost));
      setSavedPosts((current) => updatePostItems(current, updatedPost));
      setArchivePosts((current) => updatePostItems(current, updatedPost));
      setBinPosts((current) => updatePostItems(current, updatedPost));
      setCapsuleNotice(
        `Time capsule rescheduled. It now opens ${formatCapsuleDate(updatedPost.visibleAt ?? releaseAt)}.`,
      );
      setCapsuleEditorPost(null);
      setCapsuleValue("");
    } catch (capsuleUpdateError) {
      setCapsuleError(
        capsuleUpdateError instanceof Error
          ? capsuleUpdateError.message
          : "Failed to reschedule time capsule.",
      );
    } finally {
      setCapsuleSaving(false);
    }
  };

  const publishCapsuleNow = async (postId: string) => {
    if (capsuleActionId) {
      return;
    }

    setCapsuleActionId(postId);
    setError(null);
    setCapsuleNotice(null);

    try {
      const response = await fetch(`/api/posts/${postId}/capsule`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as {
        post?: Post;
        error?: string;
      };

      if (!response.ok || !payload.post) {
        throw new Error(payload.error ?? "Failed to publish time capsule.");
      }

      const updatedPost = payload.post;
      setPosts((current) => updatePostItems(current, updatedPost));
      setAllPosts((current) =>
        updatePostItems(current, updatedPost, { addIfMissing: true, addToFront: true }),
      );
      setSavedPosts((current) => updatePostItems(current, updatedPost));
      setArchivePosts((current) => updatePostItems(current, updatedPost));
      setBinPosts((current) => updatePostItems(current, updatedPost));
      if (capsuleEditorPost?.id === postId) {
        setCapsuleEditorPost(null);
        setCapsuleValue("");
        setCapsuleError(null);
      }
      setCapsuleNotice("Time capsule published now.");
    } catch (capsulePublishError) {
      setError(
        capsulePublishError instanceof Error
          ? capsulePublishError.message
          : "Failed to publish time capsule.",
      );
    } finally {
      setCapsuleActionId(null);
    }
  };

  const openEditProfile = () => {
    if (!user) return;
    const parts = user.name.split(" ");
    setEditFirstName(parts[0] || "");
    setEditLastName(parts.slice(1).join(" ") || "");
    setEditHandle(user.handle);
    setEditBio(user.bio ?? "");
    setEditAvatarUrl(user.avatarUrl ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const uploadAvatar = async (file: File) => {
    setEditAvatarUploading(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "Photo");
      const response = await fetch("/api/media/upload", { method: "POST", body: fd });
      const payload = (await response.json().catch(() => ({}))) as { mediaUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      if (payload.mediaUrl) setEditAvatarUrl(payload.mediaUrl);
    } catch (uploadError) {
      setEditError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setEditAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setEditSaving(true);
    setEditError(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${editFirstName.trim()} ${editLastName.trim()}`.trim(), handle: editHandle.trim(), bio: editBio.trim(), avatarUrl: editAvatarUrl }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        user?: User;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save profile.");
      }

      if (payload.user) {
        setUser(payload.user);
        if (isViewingSelf) {
          setProfileOwner(payload.user);
        }
      }

      setEditOpen(false);
    } catch (saveError) {
      setEditError(
        saveError instanceof Error ? saveError.message : "Failed to save profile.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const openPrivacySettings = () => {
    if (!user) return;
    setEditAccountType(user.accountType ?? "public");
    setEditVisibility(user.feedVisibility ?? "everyone");
    setEditHiddenIds(user.hiddenFromIds ?? []);
    setEditInterests(user.interests ?? []);
    setUserSearchQuery("");
    setUserSearchResults([]);
    setPrivacyError(null);
    setPrivacyOpen(true);
  };

  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const delayId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(userSearchQuery)}`);
        const payload = await res.json();
        if (res.ok && payload.users) {
          setUserSearchResults(payload.users);
        }
      } catch { }
    }, 300);
    return () => clearTimeout(delayId);
  }, [userSearchQuery]);

  const savePrivacySettings = async () => {
    if (!user) return;
    setPrivacySaving(true);
    setPrivacyError(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: editAccountType,
          feedVisibility: editVisibility,
          hiddenFromIds: editHiddenIds,
          interests: editInterests,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        user?: User;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save privacy settings.");
      }

      if (payload.user) {
        setUser(payload.user);
        if (isViewingSelf) {
          setProfileOwner(payload.user);
        }
      }

      setPrivacyOpen(false);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : "Failed to save privacy settings.");
    } finally {
      setPrivacySaving(false);
    }
  };

  if (loading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-6xl p-6">Loading profile...</div>
      </main>
    );
  }

  if (!profileOwner) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-xl p-6">
          <p className="text-sm text-slate-600">Profile not available.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Feed
          </Link>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Profile</p>
        </div>

        <section className="motion-surface p-5">
          <ProfileHero
            owner={profileOwner}
            isViewingSelf={isViewingSelf}
            viewerEmail={user?.email}
            isAuthenticated={Boolean(user)}
            postCount={profilePosts.length}
            followerCount={followStats.followerCount}
            followingCount={followStats.followingCount}
            savedCount={savedPosts.length}
            isFollowing={followStats.isFollowing}
            followLoading={followLoading}
            tabs={PROFILE_TABS}
            activeTab={activeTab}
            layoutEditMode={layoutEditMode}
            showCreatorStudio={currentAccountType === "creator"}
            onSelectTab={(tabId) => {
              const nextTab = PROFILE_TABS.find((tab) => tab.id === tabId);
              if (nextTab) {
                selectTab(nextTab.id);
              }
            }}
            onOpenFollowers={() => openFollowList("followers")}
            onOpenFollowing={() => openFollowList("following")}
            onToggleLayoutEdit={() => {
              setLayoutEditMode((current) => !current);
              setDraggingId(null);
              setDragOverId(null);
            }}
            onOpenSettings={openPrivacySettings}
            onOpenEditProfile={openEditProfile}
            onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
            onToggleFollow={toggleFollow}
          />
          {layoutEditMode && activeTab === "posts" ? (
            <p className="mt-3 text-xs text-slate-500">
              Layout edit is on. Drag posts to rearrange, tap the pin to lock placement.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {followError ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {followError}
            </p>
          ) : null}
          {capsuleNotice ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {capsuleNotice}
            </p>
          ) : null}

          <ProfileMediaGrid
            posts={visiblePosts}
            activeTab={activeTab}
            layoutEditMode={layoutEditMode}
            draggingId={draggingId}
            dragOverId={dragOverId}
            canReorder={canReorder}
            viewerUserId={user?.id ?? null}
            displayPinnedIds={displayPinnedSet}
            capsuleActionId={capsuleActionId}
            capsuleSaving={capsuleSaving}
            capsuleEditorPostId={capsuleEditorPost?.id ?? null}
            onToggleSave={toggleSave}
            onDelete={deletePost}
            onRestore={restorePost}
            onArchive={archivePost}
            onUnarchive={unarchivePost}
            onEditCapsule={openCapsuleEditor}
            onPublishCapsuleNow={publishCapsuleNow}
            onTogglePin={togglePin}
            onWithdrawInvite={withdrawCollabInvite}
            onDragStartFor={handleDragStart}
            onDragOverFor={handleDragOver}
            onDropFor={handleDrop}
            onDragEnd={handleDragEnd}
          />
        </section>
      </div>

      <TimeCapsuleModal
        post={capsuleEditorPost}
        saving={capsuleSaving}
        actionId={capsuleActionId}
        error={capsuleError}
        value={capsuleValue}
        minValue={capsuleMinValue}
        currentOpeningLabel={
          capsuleEditorPost?.visibleAt ? formatCapsuleDate(capsuleEditorPost.visibleAt) : "Not scheduled"
        }
        selectedOpeningLabel={capsuleValue ? formatCapsuleDate(capsuleValue) : "you choose a time"}
        onChangeValue={setCapsuleValue}
        onClose={closeCapsuleEditor}
        onPublishNow={() => {
          if (capsuleEditorPost) {
            void publishCapsuleNow(capsuleEditorPost.id);
          }
        }}
        onSave={() => void saveCapsuleSchedule()}
      />

      <EditProfileModal
        open={editOpen}
        saving={editSaving}
        error={editError}
        firstName={editFirstName}
        lastName={editLastName}
        handle={editHandle}
        bio={editBio}
        avatarUrl={editAvatarUrl}
        avatarUploading={editAvatarUploading}
        previewName={user?.name ?? profileOwner?.name ?? "Motion"}
        previewGradient={
          user?.avatarGradient ??
          profileOwner?.avatarGradient ??
          "linear-gradient(135deg, #3f7bff, #2fbde8)"
        }
        onClose={() => setEditOpen(false)}
        onChangeFirstName={setEditFirstName}
        onChangeLastName={setEditLastName}
        onChangeHandle={setEditHandle}
        onChangeBio={setEditBio}
        onUploadAvatar={(file) => {
          void uploadAvatar(file);
        }}
        onRemoveAvatar={() => setEditAvatarUrl("")}
        onSave={() => void saveProfile()}
      />

      <PrivacySettingsModal
        open={privacyOpen}
        currentAccountType={currentAccountType}
        effectiveAccountType={effectiveAccountType}
        selectedAccountType={editAccountType}
        interests={editInterests}
        visibility={editVisibility}
        hiddenIds={editHiddenIds}
        userSearchQuery={userSearchQuery}
        userSearchResults={userSearchResults}
        saving={privacySaving}
        error={privacyError}
        onClose={() => setPrivacyOpen(false)}
        onSelectAccountType={setEditAccountType}
        onChangeInterests={setEditInterests}
        onChangeVisibility={setEditVisibility}
        onChangeUserSearchQuery={setUserSearchQuery}
        onAddHiddenUser={(userId) => {
          if (!editHiddenIds.includes(userId)) {
            setEditHiddenIds([...editHiddenIds, userId]);
          }
        }}
        onRemoveHiddenUser={(userId) => {
          setEditHiddenIds(editHiddenIds.filter((hiddenId) => hiddenId !== userId));
        }}
        onClearUserSearch={() => {
          setUserSearchQuery("");
          setUserSearchResults([]);
        }}
        onSave={() => void savePrivacySettings()}
      />
      {followListOpen ? (
        <FollowListModal
          listType={followListOpen}
          loading={followLoading}
          items={followList}
          followerCount={followStats.followerCount}
          followingCount={followStats.followingCount}
          isViewingSelf={isViewingSelf}
          followActionId={followActionId}
          onClose={() => setFollowListOpen(null)}
          onOpenProfile={(handle) => router.push(`/profile?user=${handle}`)}
          onUnfollow={(follow) => void unfollowFromList(follow)}
        />
      ) : null}

      <DeleteAccountModal
        open={deleteAccountOpen}
        loading={deleteAccountLoading}
        error={deleteAccountError}
        onClose={() => setDeleteAccountOpen(false)}
        onDelete={() => void deleteAccount()}
      />
    </main>
  );
}




