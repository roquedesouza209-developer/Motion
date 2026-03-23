"use client";

import { useEffect, useState } from "react";

function formatLivePostAge(isoDate: string, now = Date.now()): string {
  const diff = Math.max(1_000, now - new Date(isoDate).getTime());
  const second = 1_000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    const seconds = Math.max(1, Math.floor(diff / second));
    return `${seconds} ${seconds === 1 ? "Sec" : "Secs"} ago`;
  }

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} ${minutes === 1 ? "Min" : "Mins"} ago`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} ${hours === 1 ? "Hr" : "Hrs"} ago`;
  }

  if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} ${days === 1 ? "Day" : "Days"} ago`;
  }

  const weeks = Math.floor(diff / week);
  return `${weeks} ${weeks === 1 ? "Week" : "Weeks"} ago`;
}

function getNextUpdateDelay(isoDate: string, now = Date.now()): number {
  const diff = Math.max(1_000, now - new Date(isoDate).getTime());
  const second = 1_000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    return second - (diff % second) || second;
  }

  if (diff < hour) {
    return minute - (diff % minute) || minute;
  }

  if (diff < day) {
    return hour - (diff % hour) || hour;
  }

  if (diff < week) {
    return day - (diff % day) || day;
  }

  return week - (diff % week) || week;
}

export default function LivePostAge({
  createdAt,
  initialLabel,
}: {
  createdAt: string;
  initialLabel?: string;
}) {
  const [label, setLabel] = useState(
    initialLabel ?? formatLivePostAge(createdAt),
  );

  useEffect(() => {
    let timeoutId: number | null = null;

    const schedule = () => {
      const now = Date.now();
      setLabel(formatLivePostAge(createdAt, now));
      timeoutId = window.setTimeout(
        schedule,
        getNextUpdateDelay(createdAt, now),
      );
    };

    schedule();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [createdAt]);

  return <>{label}</>;
}
