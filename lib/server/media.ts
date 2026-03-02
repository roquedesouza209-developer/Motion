import fs from "node:fs/promises";
import path from "node:path";

import { createId } from "@/lib/server/crypto";
import type { PostKind } from "@/lib/server/types";

const UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads");
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function inferExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    default:
      return "";
  }
}

function classifyMediaType(mimeType: string): "image" | "video" | null {
  if (IMAGE_TYPES.has(mimeType)) {
    return "image";
  }

  if (VIDEO_TYPES.has(mimeType)) {
    return "video";
  }

  return null;
}

function validateFile({
  file,
  expectedKind,
}: {
  file: File;
  expectedKind?: PostKind;
}): { mediaType: "image" | "video" } {
  if (!file || file.size <= 0) {
    throw new Error("Upload a non-empty media file.");
  }

  const mediaType = classifyMediaType(file.type);

  if (!mediaType) {
    throw new Error("Unsupported file type. Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV.");
  }

  if (mediaType === "image" && file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 10MB or smaller.");
  }

  if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
    throw new Error("Videos must be 200MB or smaller.");
  }

  if (expectedKind === "Photo" && mediaType !== "image") {
    throw new Error("Photo posts require an image file.");
  }

  if (expectedKind === "Reel" && mediaType !== "video") {
    throw new Error("Reel posts require a video file.");
  }

  return { mediaType };
}

export async function storeUploadedMedia({
  file,
  expectedKind,
}: {
  file: File;
  expectedKind?: PostKind;
}): Promise<{ mediaUrl: string; mediaType: "image" | "video" }> {
  const { mediaType } = validateFile({ file, expectedKind });
  await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });

  const extension = inferExtension(file.type);
  const filename = `${createId("upl")}${extension}`;
  const filePath = path.join(UPLOAD_DIRECTORY, filename);
  const data = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, data);

  return {
    mediaUrl: `/uploads/${filename}`,
    mediaType,
  };
}
