export type CaptionSegment =
  | { type: "text"; value: string }
  | { type: "hashtag"; value: string; tag: string };

const HASHTAG_REGEX = /#[A-Za-z0-9_]+/g;
const WORD_CHAR_REGEX = /[A-Za-z0-9_]/;

export function normalizeHashtag(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  const normalized = input.trim().replace(/^#+/, "").toLowerCase();
  const match = normalized.match(/^[a-z0-9_]{1,40}/);
  return match ? match[0] : "";
}

export function splitCaptionHashtags(text: string): CaptionSegment[] {
  if (!text) {
    return [{ type: "text", value: "" }];
  }

  const segments: CaptionSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const value = match[0];
    const index = match.index ?? 0;
    const previousChar = index > 0 ? text[index - 1] : "";

    if (previousChar && WORD_CHAR_REGEX.test(previousChar)) {
      continue;
    }

    if (cursor < index) {
      segments.push({ type: "text", value: text.slice(cursor, index) });
    }

    const tag = normalizeHashtag(value);
    if (!tag) {
      continue;
    }

    segments.push({ type: "hashtag", value, tag });
    cursor = index + value.length;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  if (segments.length === 0) {
    return [{ type: "text", value: text }];
  }

  return segments;
}

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();

  splitCaptionHashtags(text).forEach((segment) => {
    if (segment.type === "hashtag") {
      tags.add(segment.tag);
    }
  });

  return [...tags];
}
