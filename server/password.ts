import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("scrypt:")) return false;

  const parts = stored.split(":");
  if (parts.length !== 3) return false;

  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  const actual = scryptSync(password, salt, expected.length, SCRYPT_PARAMS);

  if (actual.length !== expected.length) return false;

  try {
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
