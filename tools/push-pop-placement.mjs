#!/usr/bin/env node
/**
 * ローカルでエクスポートした POP 配置 JSON を本番サーバーへ反映する。
 *
 * 使い方:
 *   node tools/push-pop-placement.mjs --input tools/pop-placement-export.json
 *   node tools/push-pop-placement.mjs --extract-localstorage   # localhost から取得試行
 *
 * 環境変数:
 *   POP_BASE_URL (default: https://pop-kaitori-tool.onrender.com)
 *   POP_USERNAME (default: Yousei710)
 *   ACCOUNT_YOUSEI710_PASSWORD
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

const LAYOUT_VERSION = 2;
const DEFAULT_BASE_URL = process.env.POP_BASE_URL ?? "https://pop-kaitori-tool.onrender.com";
const DEFAULT_USERNAME = process.env.POP_USERNAME ?? "Yousei710";
const DEFAULT_PASSWORD =
  process.env.ACCOUNT_YOUSEI710_PASSWORD ??
  process.env.POP_PASSWORD ??
  "as214117";

function parseArgs(argv) {
  const args = { input: null, extract: false, baseUrl: DEFAULT_BASE_URL, username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--extract-localstorage") args.extract = true;
    else if (arg === "--input") {
      args.input = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--base-url") {
      args.baseUrl = argv[i + 1] ?? args.baseUrl;
      i += 1;
    } else if (arg === "--username") {
      args.username = argv[i + 1] ?? args.username;
      i += 1;
    } else if (arg === "--password") {
      args.password = argv[i + 1] ?? args.password;
      i += 1;
    }
  }
  return args;
}

function createAuthToken(username) {
  const authVersion = process.env.AUTH_VERSION ?? "2";
  return createHash("sha256").update(`${username}:${authVersion}:pop-kaitori-tool`).digest("hex");
}

function extractJsonFromLevelDbDir(dir) {
  if (!existsSync(dir)) return null;

  const needle = "pop-placement-assignments-v2";
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".ldb") && !name.endsWith(".log")) continue;
    const filePath = join(dir, name);
    let text = "";
    try {
      text = readFileSync(filePath, "latin1");
    } catch {
      continue;
    }
    const marker = needle;
    const index = text.indexOf(marker);
    if (index < 0) continue;

    const start = text.indexOf("{", index);
    if (start < 0) continue;

    let depth = 0;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return parsed;
            }
          } catch {
            // continue scanning file
          }
          break;
        }
      }
    }
  }

  return null;
}

function findChromePopAssignments() {
  const roots = [
    join(homedir(), "AppData/Local/Google/Chrome/User Data"),
    join(homedir(), "AppData/Local/Microsoft/Edge/User Data"),
  ];

  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const profile of readdirSync(root)) {
      const levelDb = join(root, profile, "Local Storage/leveldb");
      const extracted = extractJsonFromLevelDbDir(levelDb);
      if (extracted && countAssignments(extracted) > 0) {
        return { assignments: extracted, source: levelDb };
      }
    }
  }

  return null;
}

function countAssignments(store) {
  let count = 0;
  for (const wall of Object.values(store)) {
    if (wall && typeof wall === "object") count += Object.keys(wall).length;
  }
  return count;
}

async function login(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ログイン失敗 (${response.status}): ${body}`);
  }

  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookieHeader = setCookie.map((part) => part.split(";")[0]).join("; ");
  if (!cookieHeader) {
    throw new Error("ログイン Cookie を取得できませんでした");
  }

  return cookieHeader;
}

async function pushAssignments(baseUrl, cookieHeader, assignments) {
  const response = await fetch(`${baseUrl}/api/pop-placement`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      layoutVersion: LAYOUT_VERSION,
      assignments,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`反映失敗 (${response.status}): ${body}`);
  }

  return JSON.parse(body);
}

async function main() {
  const args = parseArgs(process.argv);
  let assignments = null;
  let sourceLabel = "";

  if (args.input) {
    const inputPath = resolve(args.input);
    assignments = JSON.parse(readFileSync(inputPath, "utf-8"));
    sourceLabel = inputPath;
  } else if (args.extract) {
    const extracted = findChromePopAssignments();
    if (!extracted) {
      throw new Error(
        "Chrome/Edge の localStorage から配置データを見つけられませんでした。Chrome を一度閉じてから再実行するか、--input で JSON を指定してください。",
      );
    }
    assignments = extracted.assignments;
    sourceLabel = extracted.source;
  } else {
    throw new Error("--input <file.json> または --extract-localstorage を指定してください");
  }

  const count = countAssignments(assignments);
  if (count === 0) {
    throw new Error("配置データが空です");
  }

  console.log(`配置件数: ${count}（取得元: ${sourceLabel}）`);
  console.log(`反映先: ${args.baseUrl}（${args.username}）`);

  const cookieHeader = await login(args.baseUrl, args.username, args.password);
  const result = await pushAssignments(args.baseUrl, cookieHeader, assignments);

  const outDir = resolve("tools");
  mkdirSync(outDir, { recursive: true });
  const exportPath = resolve(outDir, "pop-placement-export.json");
  writeFileSync(exportPath, JSON.stringify(assignments, null, 2), "utf-8");

  console.log("サーバーへ反映しました。");
  console.log(`updatedAt: ${result.updatedAt}`);
  console.log(`updatedBy: ${result.updatedBy}`);
  console.log(`バックアップ保存: ${exportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
