import Link from "next/link";

import { splitCaptionHashtags } from "@/lib/hashtags";

type CaptionWithHashtagsProps = {
  caption: string;
  className?: string;
  hashtagClassName?: string;
};

export default function CaptionWithHashtags({
  caption,
  className,
  hashtagClassName,
}: CaptionWithHashtagsProps) {
  const segments = splitCaptionHashtags(caption);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.type === "hashtag" ? (
          <Link
            key={`${segment.tag}-${index}`}
            href={`/tags/${encodeURIComponent(segment.tag)}`}
            className={
              hashtagClassName ??
              "font-semibold text-[var(--brand)] transition hover:opacity-80"
            }
          >
            {segment.value}
          </Link>
        ) : (
          <span key={`text-${index}`}>{segment.value}</span>
        ),
      )}
    </span>
  );
}
