"use client";

import Link from "next/link";

import { INTEREST_OPTIONS, type InterestKey } from "@/lib/interests";

type FollowingTopicsSettingsProps = {
  interests: InterestKey[];
  onChange: (next: InterestKey[]) => void;
};

export default function FollowingTopicsSettings({
  interests,
  onChange,
}: FollowingTopicsSettingsProps) {
  const removeInterest = (interestId: InterestKey) => {
    onChange(interests.filter((item) => item !== interestId));
  };

  const toggleInterest = (interestId: InterestKey) => {
    onChange(
      interests.includes(interestId)
        ? interests.filter((item) => item !== interestId)
        : [...interests, interestId],
    );
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Following topics</p>
          <p className="mt-1 text-sm text-slate-500">
            Manage the topics you follow so Feed, Reels, and Explore stay aligned
            with what you want to see more often.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {interests.length} following
          </span>
          <Link
            href="/explore"
            className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Open Explore
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--brand)]/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Following now
            </p>
            <p className="mt-1 text-sm text-slate-600">
              These are the topics currently boosting what Motion prioritizes for you.
            </p>
          </div>
        </div>

        {interests.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {INTEREST_OPTIONS.filter((interest) => interests.includes(interest.id)).map(
              (interest) => (
                <button
                  key={`followed-topic-${interest.id}`}
                  type="button"
                  onClick={() => removeInterest(interest.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)] bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
                  aria-label={`Unfollow ${interest.label}`}
                >
                  {interest.label}
                  <span className="text-[11px] leading-none">x</span>
                </button>
              ),
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] bg-white/80 px-3 py-3 text-sm text-slate-500">
            You are not following any topics yet. Pick a few below to shape your
            home feed and explore results.
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {INTEREST_OPTIONS.map((interest) => {
          const active = interests.includes(interest.id);

          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggleInterest(interest.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-[var(--brand)] bg-[var(--brand)]/8"
                  : "border-[var(--line)] bg-white hover:border-[var(--brand)]"
              }`}
              aria-pressed={active}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{interest.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {active
                      ? "Following. Tap to unfollow."
                      : "Follow this topic across Feed, Reels, and Explore."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    active
                      ? "bg-[var(--brand)] text-white"
                      : "border border-[var(--line)] bg-white text-slate-600"
                  }`}
                >
                  {active ? "Following" : "Follow"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
