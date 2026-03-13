"use client";

import LivePostAge from "@/components/live-post-age";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MediaType = "image" | "video";
type ProfileTab = "posts" | "saved" | "tagged";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarGradient: string;
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
  if (input === "saved" || input === "tagged") {
    return input;
  }

  return "posts";
}

function MediaTile({
  post,
  onToggleSave,
  onDelete,
  canDelete,
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
  canDelete: boolean;
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
      className={`group relative aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-white ${
        draggable ? "profile-tile-draggable" : ""
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [postOrder, setPostOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const [following, discover, saved] = await Promise.all([
          apiGet<{ posts: Post[] }>("/api/posts?scope=following"),
          apiGet<{ posts: Post[] }>("/api/posts?scope=discover"),
          apiGet<{ posts: Post[] }>("/api/posts/saved"),
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
    activeTab === "saved" ? savedPosts : activeTab === "tagged" ? taggedPosts : posts;
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
      const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete post.");
      }

      setPosts((current) => current.filter((post) => post.id !== postId));
      setAllPosts((current) => current.filter((post) => post.id !== postId));
      setSavedPosts((current) => current.filter((post) => post.id !== postId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete post.",
      );
    } finally {
      setDeletingId(null);
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
              <div>
                <h1
                  className="text-2xl font-semibold text-slate-900"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {user.name}
                </h1>
                <p className="text-sm text-slate-500">@{user.handle}</p>
                <p className="mt-1 text-xs text-slate-500">{user.email}</p>
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

          <div className="mt-5 inline-flex rounded-full border border-[var(--line)] bg-white p-1">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.id ? "bg-[var(--brand)] text-white" : "text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                  canDelete={post.userId === user.id && activeTab === "posts"}
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
                  : "No posts yet."}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
