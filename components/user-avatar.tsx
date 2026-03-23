"use client";

import type { ReactNode } from "react";

import Image from "next/image";

type UserAvatarProps = {
  name: string;
  avatarGradient: string;
  avatarUrl?: string;
  className?: string;
  textClassName?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
};

export default function UserAvatar({
  name,
  avatarGradient,
  avatarUrl,
  className = "",
  textClassName = "text-sm font-semibold text-white",
  imageClassName = "object-cover",
  sizes = "64px",
  priority = false,
  children,
}: UserAvatarProps) {
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MO";

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}
      style={avatarUrl ? undefined : { background: avatarGradient }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className={imageClassName}
        />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
      {children}
    </div>
  );
}
