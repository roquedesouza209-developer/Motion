import type { ProfileAccent, ProfileCoverTheme } from "@/lib/server/types";

export const DEFAULT_PROFILE_COVER: ProfileCoverTheme = "midnight";
export const DEFAULT_PROFILE_ACCENT: ProfileAccent = "cobalt";

export const PROFILE_COVER_OPTIONS: {
  id: ProfileCoverTheme;
  label: string;
  background: string;
}[] = [
  {
    id: "midnight",
    label: "Midnight",
    background:
      "linear-gradient(135deg, rgba(9, 17, 31, 0.96), rgba(18, 42, 78, 0.92) 52%, rgba(31, 91, 164, 0.88))",
  },
  {
    id: "sunrise",
    label: "Sunrise",
    background:
      "linear-gradient(135deg, rgba(253, 186, 116, 0.96), rgba(251, 113, 133, 0.9) 48%, rgba(245, 158, 11, 0.88))",
  },
  {
    id: "aurora",
    label: "Aurora",
    background:
      "linear-gradient(135deg, rgba(17, 94, 89, 0.95), rgba(14, 165, 233, 0.88) 48%, rgba(167, 243, 208, 0.92))",
  },
  {
    id: "studio",
    label: "Studio",
    background:
      "linear-gradient(135deg, rgba(56, 36, 97, 0.95), rgba(129, 140, 248, 0.88) 45%, rgba(251, 191, 36, 0.84))",
  },
];

export const PROFILE_ACCENT_OPTIONS: {
  id: ProfileAccent;
  label: string;
  solid: string;
  glow: string;
}[] = [
  { id: "cobalt", label: "Cobalt", solid: "#4f7cff", glow: "rgba(79, 124, 255, 0.35)" },
  { id: "ember", label: "Ember", solid: "#e97842", glow: "rgba(233, 120, 66, 0.34)" },
  { id: "jade", label: "Jade", solid: "#22b8a3", glow: "rgba(34, 184, 163, 0.34)" },
  { id: "violet", label: "Violet", solid: "#8a63ff", glow: "rgba(138, 99, 255, 0.34)" },
];

export function isProfileCoverTheme(value: unknown): value is ProfileCoverTheme {
  return PROFILE_COVER_OPTIONS.some((option) => option.id === value);
}

export function isProfileAccent(value: unknown): value is ProfileAccent {
  return PROFILE_ACCENT_OPTIONS.some((option) => option.id === value);
}

export function getProfileCoverBackground(coverTheme?: ProfileCoverTheme): string {
  return (
    PROFILE_COVER_OPTIONS.find((option) => option.id === coverTheme)?.background ??
    PROFILE_COVER_OPTIONS[0].background
  );
}

export function getProfileAccentMeta(accent?: ProfileAccent) {
  return (
    PROFILE_ACCENT_OPTIONS.find((option) => option.id === accent) ??
    PROFILE_ACCENT_OPTIONS[0]
  );
}
