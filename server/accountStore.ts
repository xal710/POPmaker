import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  AccountApplication,
  AccountApplicationStatus,
  AccountRegistrationInput,
  StoredSiteAccount,
} from "../shared/accountRegistration";
import { ADMIN_USERNAME } from "../shared/admin";
import {
  DEFAULT_ACCOUNT_TWEET_PROFILE,
  normalizeAccountTweetProfile,
  type TweetTemplateMode,
} from "../shared/accountProfile";
import { getDataDir } from "./config";
import { hashPassword, verifyPassword } from "./password";

const ACCOUNTS_FILENAME = "site-accounts.json";

interface AccountStoreData {
  accounts: StoredSiteAccount[];
  applications: AccountApplication[];
}

let memoryCache: AccountStoreData | null = null;

function getStorePath(): string {
  return resolve(getDataDir(), ACCOUNTS_FILENAME);
}

function defaultLegacyPopPlacementUsernames(): Set<string> {
  return new Set(["administrator", "Yousei710", "akito00"]);
}

function defaultLegacyTradeFeatureUsernames(): Set<string> {
  return new Set(["h.mizuno"]);
}

function getLegacySeedAccounts(): Array<Omit<StoredSiteAccount, "applicationId" | "createdAt">> {
  const popUsers = defaultLegacyPopPlacementUsernames();
  const tradeUsers = defaultLegacyTradeFeatureUsernames();
  const seeds = [
    { username: "administrator", password: process.env.ACCOUNT_ADMINISTRATOR_PASSWORD ?? "as214117" },
    { username: "Yousei710", password: process.env.ACCOUNT_YOUSEI710_PASSWORD ?? "as214117" },
    { username: "akito00", password: process.env.ACCOUNT_AKITO00_PASSWORD ?? "12390248" },
    { username: "k.ishigaki", password: process.env.ACCOUNT_K_ISHIGAKI_PASSWORD ?? "ka1214" },
    { username: "20260605", password: process.env.ACCOUNT_20260605_PASSWORD ?? "kouki0306" },
    { username: "h.mizuno", password: process.env.ACCOUNT_H_MIZUNO_PASSWORD ?? "6m6i6z6u6n6o6" },
  ];

  const now = new Date().toISOString();
  return seeds.map((seed) => ({
    username: seed.username,
    passwordHash: hashPassword(seed.password),
    displayName: seed.username,
    store: null,
    position: "社員" as const,
    canUsePopPlacement: popUsers.has(seed.username),
    canUseTradeFeatures: tradeUsers.has(seed.username),
    tweetTemplateMode: DEFAULT_ACCOUNT_TWEET_PROFILE.tweetTemplateMode,
    tweetTemplateCustom: DEFAULT_ACCOUNT_TWEET_PROFILE.tweetTemplateCustom,
    applicationId: null,
    createdAt: now,
  }));
}

function emptyStore(): AccountStoreData {
  return { accounts: [], applications: [] };
}

function readStoreFromDisk(): AccountStoreData {
  const path = getStorePath();
  if (!existsSync(path)) {
    return {
      accounts: getLegacySeedAccounts(),
      applications: [],
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as AccountStoreData;
    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.applications)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function normalizeStoredAccount(account: StoredSiteAccount): StoredSiteAccount {
  const tweetProfile = normalizeAccountTweetProfile(account);
  return {
    ...account,
    canUseTradeFeatures: account.canUseTradeFeatures ?? false,
    tweetTemplateMode: tweetProfile.tweetTemplateMode,
    tweetTemplateCustom: tweetProfile.tweetTemplateCustom,
  };
}

function seedsByUsername(): Map<string, StoredSiteAccount> {
  return new Map(getLegacySeedAccounts().map((seed) => [seed.username, seed]));
}

function applySeedFeatureDefaults(account: StoredSiteAccount): StoredSiteAccount {
  const seed = seedsByUsername().get(account.username);
  return {
    ...account,
    canUseTradeFeatures:
      account.canUseTradeFeatures ?? seed?.canUseTradeFeatures ?? false,
    canUsePopPlacement:
      account.canUsePopPlacement ?? seed?.canUsePopPlacement ?? false,
  };
}

function loadStore(): AccountStoreData {
  if (!memoryCache) {
    const data = readStoreFromDisk();
    memoryCache = {
      accounts: data.accounts.map((account) =>
        normalizeStoredAccount(applySeedFeatureDefaults(account)),
      ),
      applications: data.applications,
    };
  }
  return memoryCache;
}

function saveStore(data: AccountStoreData): void {
  memoryCache = data;
  const path = getStorePath();
  mkdirSync(getDataDir(), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

function mergeMissingSeedAccounts(): void {
  const raw = readStoreFromDisk();
  const store = loadStore();
  const existing = new Set(store.accounts.map((account) => account.username));
  const seedMap = seedsByUsername();
  let changed = false;

  for (const seed of seedMap.values()) {
    if (existing.has(seed.username)) continue;
    store.accounts.push(seed);
    changed = true;
  }

  for (const rawAccount of raw.accounts) {
    const seed = seedMap.get(rawAccount.username);
    if (!seed) continue;
    if (rawAccount.canUseTradeFeatures === undefined) changed = true;
    if (rawAccount.canUsePopPlacement === undefined) changed = true;
  }

  if (changed) {
    saveStore(store);
  }
}

export function ensureAccountStoreFile(): void {
  const path = getStorePath();
  if (!existsSync(path)) {
    saveStore(readStoreFromDisk());
  }
  mergeMissingSeedAccounts();
}

export function listStoredAccounts(): StoredSiteAccount[] {
  return [...loadStore().accounts];
}

export function listAccountApplications(): AccountApplication[] {
  return [...loadStore().applications];
}

export function findAccountByUsername(username: string): StoredSiteAccount | null {
  return loadStore().accounts.find((account) => account.username === username) ?? null;
}

export function findApplicationByUsername(username: string): AccountApplication | null {
  return (
    loadStore().applications.find((application) => application.desiredUsername === username) ??
    null
  );
}

export function isDesiredUsernameTaken(username: string): boolean {
  if (findAccountByUsername(username)) return true;

  const application = findApplicationByUsername(username);
  if (!application) return false;

  return application.status === "pending" || application.status === "rejected";
}

export function verifyAccountCredentials(
  username: string,
  password: string,
): StoredSiteAccount | null {
  const account = findAccountByUsername(username);
  if (!account) return null;
  if (!verifyPassword(password, account.passwordHash)) return null;
  return account;
}

export function accountCanUsePopPlacement(username: string): boolean {
  const account = findAccountByUsername(username);
  return account?.canUsePopPlacement === true;
}

export function accountCanUseTradeFeatures(username: string): boolean {
  const account = findAccountByUsername(username);
  return account?.canUseTradeFeatures === true;
}

export function submitAccountApplication(input: AccountRegistrationInput): AccountApplication {
  if (isDesiredUsernameTaken(input.desiredUsername)) {
    throw new Error("USERNAME_TAKEN");
  }

  const application: AccountApplication = {
    id: randomUUID(),
    displayName: input.displayName,
    store: input.store,
    position: input.position,
    desiredUsername: input.desiredUsername,
    passwordHash: hashPassword(input.password),
    contactedAdmin: input.contactedAdmin,
    status: "pending",
    submittedAt: new Date().toISOString(),
    rejectedAt: null,
    rejectedBy: null,
    approvedAt: null,
    approvedBy: null,
  };

  const store = loadStore();
  store.applications.push(application);
  saveStore(store);
  return application;
}

function updateApplication(
  id: string,
  patch: Partial<AccountApplication>,
): AccountApplication | null {
  const store = loadStore();
  const index = store.applications.findIndex((application) => application.id === id);
  if (index < 0) return null;

  store.applications[index] = { ...store.applications[index], ...patch };
  saveStore(store);
  return store.applications[index];
}

export function rejectAccountApplication(id: string, rejectedBy: string): AccountApplication | null {
  const application = loadStore().applications.find((entry) => entry.id === id);
  if (!application || application.status !== "pending") return null;

  return updateApplication(id, {
    status: "rejected",
    rejectedAt: new Date().toISOString(),
    rejectedBy,
  });
}

export function approveAccountApplication(
  id: string,
  approvedBy: string,
  options?: { canUsePopPlacement?: boolean; canUseTradeFeatures?: boolean },
): AccountApplication | null {
  const store = loadStore();
  const application = store.applications.find((entry) => entry.id === id);
  if (!application) return null;
  if (application.status !== "pending" && application.status !== "rejected") return null;

  if (findAccountByUsername(application.desiredUsername)) {
    throw new Error("USERNAME_ALREADY_ACTIVE");
  }

  const now = new Date().toISOString();
  const account: StoredSiteAccount = {
    username: application.desiredUsername,
    passwordHash: application.passwordHash,
    displayName: application.displayName,
    store: application.store,
    position: application.position,
    canUsePopPlacement: options?.canUsePopPlacement ?? false,
    canUseTradeFeatures: options?.canUseTradeFeatures ?? false,
    tweetTemplateMode: DEFAULT_ACCOUNT_TWEET_PROFILE.tweetTemplateMode,
    tweetTemplateCustom: DEFAULT_ACCOUNT_TWEET_PROFILE.tweetTemplateCustom,
    applicationId: application.id,
    createdAt: now,
  };

  store.accounts.push(account);
  store.applications = store.applications.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          status: "approved" as AccountApplicationStatus,
          approvedAt: now,
          approvedBy,
          rejectedAt: entry.status === "rejected" ? entry.rejectedAt : null,
          rejectedBy: entry.status === "rejected" ? entry.rejectedBy : null,
        }
      : entry,
  );

  saveStore(store);
  return store.applications.find((entry) => entry.id === id) ?? null;
}

export function setAccountPopPlacementAccess(
  username: string,
  canUsePopPlacement: boolean,
): StoredSiteAccount | null {
  if (username === ADMIN_USERNAME && !canUsePopPlacement) {
    return null;
  }

  const store = loadStore();
  const index = store.accounts.findIndex((account) => account.username === username);
  if (index < 0) return null;

  store.accounts[index] = {
    ...store.accounts[index],
    canUsePopPlacement,
    canUseTradeFeatures: canUsePopPlacement
      ? false
      : store.accounts[index].canUseTradeFeatures,
  };
  saveStore(store);
  return store.accounts[index];
}

export function setAccountTradeFeaturesAccess(
  username: string,
  canUseTradeFeatures: boolean,
): StoredSiteAccount | null {
  const store = loadStore();
  const index = store.accounts.findIndex((account) => account.username === username);
  if (index < 0) return null;

  const account = store.accounts[index];
  store.accounts[index] = {
    ...account,
    canUseTradeFeatures,
    canUsePopPlacement: canUseTradeFeatures ? false : account.canUsePopPlacement,
  };
  saveStore(store);
  return store.accounts[index];
}

export interface AccountProfilePatch {
  canUsePopPlacement?: boolean;
  canUseTradeFeatures?: boolean;
  tweetTemplateMode?: TweetTemplateMode;
  tweetTemplateCustom?: string | null;
}

export function updateAccountProfile(
  username: string,
  patch: AccountProfilePatch,
): StoredSiteAccount | null {
  const store = loadStore();
  const index = store.accounts.findIndex((account) => account.username === username);
  if (index < 0) return null;

  const current = store.accounts[index];
  let next: StoredSiteAccount = { ...current };

  if (patch.canUsePopPlacement !== undefined) {
    if (username === ADMIN_USERNAME && !patch.canUsePopPlacement) {
      return null;
    }
    next.canUsePopPlacement = patch.canUsePopPlacement;
    if (patch.canUsePopPlacement) {
      next.canUseTradeFeatures = false;
    }
  }

  if (patch.canUseTradeFeatures !== undefined) {
    next.canUseTradeFeatures = patch.canUseTradeFeatures;
    if (patch.canUseTradeFeatures) {
      next.canUsePopPlacement = false;
    }
  }

  if (patch.tweetTemplateMode !== undefined) {
    next.tweetTemplateMode = patch.tweetTemplateMode;
  }

  if (patch.tweetTemplateCustom !== undefined) {
    next.tweetTemplateCustom = patch.tweetTemplateCustom;
  }

  next = normalizeStoredAccount(next);
  store.accounts[index] = next;
  saveStore(store);
  return next;
}

export function listApplicationsByStatus(
  status: AccountApplicationStatus,
): AccountApplication[] {
  return loadStore().applications.filter((application) => application.status === status);
}
