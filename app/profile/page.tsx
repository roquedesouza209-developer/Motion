"use client";

import LivePostAge from "@/components/live-post-age";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MediaType = "image" | "video";
type ProfileTab = "posts" | "saved" | "tagged" | "bin";
type FeedVisibility = "everyone" | "followers" | "non_followers" | "custom";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarGradient: string;
  avatarUrl?: string;
  bio?: string;
  feedVisibility?: FeedVisibility;
  hiddenFromIds?: string[];
};

type Post = {
  id: string;
  author: string;
  handle: string;
  userId: string;
  kind: "Photo" | "Reel";
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

function syncOrder(items: Post[], order: string[]): string[] {
  if (items.length === 0) {
    return [];
  }

  const itemIds = new Set(items.map((item) => item.id));
  const filtered = order.filter((id) => itemIds.has(id));
  const missing = items.map((item) => item.id).filter((id) => !filtered.includes(id));
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

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "saved", label: "Vault" },
  { id: "tagged", label: "Tagged" },
  { id: "bin", label: "Bin" },
];

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

function normalizeProfileTab(input: string | null): ProfileTab {
  if (input === "saved" || input === "tagged" || input === "bin") {
    return input;
  }

  return "posts";
}

function MediaTile({
  post,
  onToggleSave,
  onDelete,
  onRestore,
  canDelete,
  canRestore,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
}: {
  post: Post;
  onToggleSave: (postId: string) => void;
  onDelete: (postId: string) => void;
  onRestore?: (postId: string) => void;
  canDelete: boolean;
  canRestore?: boolean;
  draggable: boolean;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
  isDragging: boolean;
  isDropTarget: boolean;
}) {
  return (
    <article
      className={`group relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-white ${draggable ? "profile-tile-draggable" : ""
        } ${isDragging ? "profile-tile-dragging" : ""} ${isDropTarget ? "profile-tile-drop" : ""}`}
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
      <div className="absolute left-3 top-3 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
        {post.kind}
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span className="rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <LivePostAge createdAt={post.createdAt} initialLabel={post.timeAgo} />
        </span>
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
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-black/60"
            aria-label="Delete post"
            title="Delete"
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
          <p className="truncate text-xs text-white/80">
            {post.caption || post.handle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleSave(post.id)}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-sm ${post.saved
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [binPosts, setBinPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [postOrder, setPostOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editAvatarUploading, setEditAvatarUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [editVisibility, setEditVisibility] = useState<FeedVisibility>("everyone");
  const [editHiddenIds, setEditHiddenIds] = useState<string[]>([]);
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

      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });

        if (meRes.status === 401) {
          router.replace("/");
          return;
        }

        const mePayload = (await meRes.json()) as { user: User };
        const currentUser = mePayload.user;
        setUser(currentUser);

        const [following, discover, saved, binReq] = await Promise.all([
          apiGet<{ posts: Post[] }>("/api/posts?scope=following"),
          apiGet<{ posts: Post[] }>("/api/posts?scope=discover"),
          apiGet<{ posts: Post[] }>("/api/posts/saved"),
          apiGet<{ posts: Post[] }>("/api/posts?scope=bin"),
        ]);

        const deduped = new Map<string, Post>();

        [...following.posts, ...discover.posts].forEach((post) => {
          if (!deduped.has(post.id)) {
            deduped.set(post.id, post);
          }
        });

        const ownPosts = [...deduped.values()].filter(
          (post) => post.author === currentUser.name,
        );
        const storedOrder = parseStoredOrder(
          window.localStorage.getItem(`motion-post-order:${currentUser.id}`),
        );
        const nextOrder = syncOrder(ownPosts, storedOrder);

        setAllPosts([...deduped.values()]);
        setPostOrder(nextOrder);
        setPosts(applyOrder(ownPosts, nextOrder));
        setSavedPosts(saved.posts);
        setBinPosts(binReq.posts);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  const taggedPosts = useMemo(() => {
    if (!user) {
      return [] as Post[];
    }

    const handleTag = user.handle.toLowerCase();
    const nameTag = user.name.toLowerCase();

    return allPosts.filter(
      (post) =>
        post.author !== user.name &&
        (
          post.caption.toLowerCase().includes(`@${handleTag}`) ||
          post.caption.toLowerCase().includes(nameTag)
        ),
    );
  }, [allPosts, user]);

  const visiblePosts =
    activeTab === "saved"
      ? savedPosts
      : activeTab === "tagged"
        ? taggedPosts
        : activeTab === "bin"
          ? binPosts
          : posts;
  const canReorder = activeTab === "posts";

  const selectTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    router.replace(tab === "posts" ? "/profile" : `/profile?tab=${tab}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    window.localStorage.setItem(
      `motion-post-order:${user.id}`,
      JSON.stringify(postOrder),
    );
  }, [postOrder, user]);

  const handleDragStart = (postId: string) => (event: React.DragEvent<HTMLElement>) => {
    if (!canReorder) {
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

    setPosts((current) => {
      const next = [...current];
      const fromIndex = next.findIndex((post) => post.id === draggedId);
      const toIndex = next.findIndex((post) => post.id === postId);

      if (fromIndex < 0 || toIndex < 0) {
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
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete post.",
      );
    } finally {
      setDeletingId(null);
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
      }

      setBinPosts((current) => current.filter((post) => post.id !== postId));
    } catch (restoreError) {
      setError(
        restoreError instanceof Error ? restoreError.message : "Failed to restore post.",
      );
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
    setEditVisibility(user.feedVisibility ?? "everyone");
    setEditHiddenIds(user.hiddenFromIds ?? []);
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
        body: JSON.stringify({ feedVisibility: editVisibility, hiddenFromIds: editHiddenIds }),
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

  if (!user) {
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
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--line)]"
                />
              ) : (
                <div
                  className="grid h-20 w-20 place-items-center rounded-full text-lg font-bold text-white"
                  style={{ background: user.avatarGradient }}
                >
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className="text-2xl font-semibold text-slate-900"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {user.name}
                  </h1>
                  <button
                    type="button"
                    onClick={openEditProfile}
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
                </div>
                <p className="text-sm text-slate-500">@{user.handle}</p>
                <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                {user.bio ? (
                  <p className="mt-2 max-w-md text-sm text-slate-700">{user.bio}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center">
                <p className="text-lg font-semibold text-slate-900">{posts.length}</p>
                <p className="text-xs text-slate-500">Posts</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center">
                <p className="text-lg font-semibold text-slate-900">{savedPosts.length}</p>
                <p className="text-xs text-slate-500">Vault</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-center">
                <p className="text-lg font-semibold text-slate-900">{taggedPosts.length}</p>
                <p className="text-xs text-slate-500">Tagged</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="inline-flex rounded-full border border-[var(--line)] bg-white p-1">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? "bg-[var(--brand)] text-white" : "text-slate-600"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openPrivacySettings}
              className="flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              aria-label="Privacy Settings"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Privacy
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {visiblePosts.length > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {visiblePosts.map((post) => (
                <MediaTile
                  key={post.id}
                  post={post}
                  onToggleSave={toggleSave}
                  onDelete={deletePost}
                  onRestore={restorePost}
                  canDelete={post.userId === user.id && (activeTab === "posts" || activeTab === "bin")}
                  canRestore={post.userId === user.id && activeTab === "bin"}
                  draggable={canReorder}
                  onDragStart={handleDragStart(post.id)}
                  onDragOver={handleDragOver(post.id)}
                  onDrop={handleDrop(post.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingId === post.id}
                  isDropTarget={dragOverId === post.id && draggingId !== post.id}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-slate-500">
              {activeTab === "saved"
                ? "No vault posts yet."
                : activeTab === "tagged"
                  ? "No tagged posts yet."
                  : activeTab === "bin"
                    ? "Bin is empty."
                    : "No posts yet."}
            </div>
          )}
        </section>
      </div>

      {editOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
          onClick={() => { if (!editSaving) setEditOpen(false); }}
        >
          <section
            className="motion-surface w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update your profile picture, name, username, and bio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
                aria-label="Close edit profile"
                disabled={editSaving}
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                    placeholder="First Name"
                    maxLength={25}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                    placeholder="Last Name"
                    maxLength={25}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Username
                </label>
                <div className="flex items-center gap-0">
                  <span className="flex h-10 items-center rounded-l-xl border border-r-0 border-[var(--line)] bg-slate-50 px-3 text-sm text-slate-500">
                    @
                  </span>
                  <input
                    type="text"
                    value={editHandle}
                    onChange={(e) => setEditHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                    className="h-10 flex-1 rounded-r-xl border border-[var(--line)] bg-white px-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                    placeholder="username"
                    maxLength={30}
                  />
                </div>
              </div>

              {/* Avatar upload */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {editAvatarUrl ? (
                    <img
                      src={editAvatarUrl}
                      alt="Avatar preview"
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--line)]"
                    />
                  ) : (
                    <div
                      className="grid h-16 w-16 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ background: user.avatarGradient }}
                    >
                      {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                      {editAvatarUploading ? "Uploading..." : "Choose Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={editAvatarUploading || editSaving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadAvatar(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {editAvatarUrl ? (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl("")}
                        className="text-left text-[11px] text-red-500 hover:underline"
                      >
                        Remove photo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Bio</span>
                  <span className="text-[10px] text-slate-500">{editBio.length}/160</span>
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="min-h-20 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                  placeholder="Tell people about yourself..."
                  maxLength={160}
                />
              </div>

              {editError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {/* Privacy Modal */}
      {privacyOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
          onClick={() => { if (!privacySaving) setPrivacyOpen(false); }}
        >
          <section
            className="motion-surface w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Privacy Settings"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Privacy Settings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose who can see your posts and reels.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Visible To
                </label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value as FeedVisibility)}
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="everyone">Everyone</option>
                  <option value="followers">Followers Only</option>
                  <option value="non_followers">Non-Followers Only</option>
                  <option value="custom">Custom (Hide from specific users)</option>
                </select>
              </div>

              {editVisibility === "custom" ? (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Hide from these users
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                    />
                    {userSearchResults.length > 0 ? (
                      <div className="absolute top-11 left-0 right-0 z-10 max-h-48 overflow-y-auto rounded-xl border border-[var(--line)] bg-white shadow-lg">
                        {userSearchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (!editHiddenIds.includes(u.id)) {
                                setEditHiddenIds([...editHiddenIds, u.id]);
                              }
                              setUserSearchQuery("");
                              setUserSearchResults([]);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="text-sm font-semibold">@{u.handle}</span>
                            <span className="text-xs text-slate-500">{u.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {editHiddenIds.length > 0 ? (
                    <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                      {editHiddenIds.map((id) => (
                        <div key={id} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-slate-700">
                          <span>User ID: {id}</span>
                          <button
                            type="button"
                            onClick={() => setEditHiddenIds(editHiddenIds.filter(hid => hid !== id))}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {privacyError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {privacyError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(false)}
                  className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
                  disabled={privacySaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void savePrivacySettings()}
                  className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={privacySaving}
                >
                  {privacySaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
