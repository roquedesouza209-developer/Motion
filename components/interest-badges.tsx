"use client";

import { getInterestLabel, type InterestKey } from "@/lib/interests";

type InterestBadgesProps = {
  interests: InterestKey[];
  variant?: "surface" | "overlay" | "accent";
  limit?: number;
};

export default function InterestBadges({
  interests,
  variant = "surface",
  limit = 3,
}: InterestBadgesProps) {
  if (interests.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {interests.slice(0, limit).map((interest) => (
        <span
          key={interest}
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            variant === "overlay"
              ? "bg-white/15 text-white backdrop-blur-sm"
              : variant === "surface"
                ? "bg-slate-100 text-slate-600"
                : "border"
          }`}
          style={
            variant === "accent"
              ? {
                  borderColor: "var(--line)",
                  background: "var(--brand-soft)",
                  color: "var(--ink-strong)",
                }
              : undefined
          }
        >
          {getInterestLabel(interest)}
        </span>
      ))}
    </div>
  );
}
