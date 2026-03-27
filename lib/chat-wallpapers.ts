export const CHAT_WALLPAPER_OPTIONS = [
  { id: "portrait", label: "Portrait" },
  { id: "midnight", label: "Midnight" },
  { id: "aurora", label: "Aurora" },
  { id: "sunset", label: "Sunset" },
  { id: "ocean", label: "Ocean" },
] as const;

export type ChatWallpaper = (typeof CHAT_WALLPAPER_OPTIONS)[number]["id"];
export type ChatWallpaperSelection = ChatWallpaper | "custom";

export const DEFAULT_CHAT_WALLPAPER: ChatWallpaper = "portrait";

export function isChatWallpaper(value: string | null | undefined): value is ChatWallpaper {
  return CHAT_WALLPAPER_OPTIONS.some((option) => option.id === value);
}

export function isChatWallpaperSelection(
  value: string | null | undefined,
): value is ChatWallpaperSelection {
  return value === "custom" || isChatWallpaper(value);
}
