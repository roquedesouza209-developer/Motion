import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function createPasswordHash(password: string, salt?: string): {
  salt: string;
  hash: string;
} {
  const normalizedSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, normalizedSalt, PASSWORD_KEY_LENGTH).toString("hex");
  return { salt: normalizedSalt, hash };
}

export function verifyPassword({
  candidate,
  passwordHash,
  passwordSalt,
}: {
  candidate: string;
  passwordHash: string;
  passwordSalt: string;
}): boolean {
  const attempted = scryptSync(candidate, passwordSalt, PASSWORD_KEY_LENGTH);
  const stored = Buffer.from(passwordHash, "hex");

  if (attempted.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(attempted, stored);
}
