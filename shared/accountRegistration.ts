import type { TweetTemplateMode } from "./accountProfile";

export const ACCOUNT_POSITIONS = ["社員", "アルバイトリーダー", "アルバイト"] as const;

export type AccountPosition = (typeof ACCOUNT_POSITIONS)[number];

export type AccountApplicationStatus = "pending" | "rejected" | "approved";

export interface AccountApplication {
  id: string;
  displayName: string;
  store: string | null;
  position: AccountPosition;
  desiredUsername: string;
  passwordHash: string;
  contactedAdmin: boolean;
  status: AccountApplicationStatus;
  submittedAt: string;
  rejectedAt: string | null;
  rejectedBy: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface StoredSiteAccount {
  username: string;
  passwordHash: string;
  displayName: string;
  store: string | null;
  position: AccountPosition;
  canUsePopPlacement: boolean;
  canUseTradeFeatures: boolean;
  tweetTemplateMode: TweetTemplateMode;
  tweetTemplateCustom: string | null;
  applicationId: string | null;
  createdAt: string;
  /** 停止中はログイン不可 */
  suspended: boolean;
  suspendedAt: string | null;
  suspendedBy: string | null;
}

export interface AccountRegistrationInput {
  displayName: string;
  store?: string | null;
  position: AccountPosition;
  desiredUsername: string;
  password: string;
  contactedAdmin: boolean;
}

const USERNAME_MAX_LENGTH = 64;

/** 空白なしの印字可能ASCII（大文字小文字区別） */
export function isValidDesiredUsername(username: string): boolean {
  const trimmed = username.trim();
  if (trimmed.length === 0 || trimmed.length > USERNAME_MAX_LENGTH) return false;
  if (trimmed !== username) return false;
  return /^[\x21-\x7E]+$/.test(trimmed);
}

export function isAccountPosition(value: string): value is AccountPosition {
  return (ACCOUNT_POSITIONS as readonly string[]).includes(value);
}

export function normalizeRegistrationInput(
  raw: Record<string, unknown>,
): AccountRegistrationInput | null {
  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  const store =
    typeof raw.store === "string" && raw.store.trim() ? raw.store.trim() : null;
  const position = typeof raw.position === "string" ? raw.position : "";
  const desiredUsername =
    typeof raw.desiredUsername === "string" ? raw.desiredUsername : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  const contactedAdmin = raw.contactedAdmin === true || raw.contactedAdmin === "yes";

  if (!displayName) return null;
  if (!isAccountPosition(position)) return null;
  if (!isValidDesiredUsername(desiredUsername)) return null;
  if (!password) return null;
  if (typeof raw.contactedAdmin !== "boolean" && raw.contactedAdmin !== "yes" && raw.contactedAdmin !== "no") {
    return null;
  }

  return {
    displayName,
    store,
    position,
    desiredUsername,
    password,
    contactedAdmin,
  };
}

export function isRegistrationFormComplete(fields: {
  displayName: string;
  position: string;
  desiredUsername: string;
  password: string;
  contactedAdmin: "" | "yes" | "no";
}): boolean {
  if (!fields.displayName.trim()) return false;
  if (!isAccountPosition(fields.position)) return false;
  if (!isValidDesiredUsername(fields.desiredUsername)) return false;
  if (!fields.password) return false;
  if (fields.contactedAdmin !== "yes" && fields.contactedAdmin !== "no") return false;
  return true;
}
