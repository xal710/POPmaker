import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json",
  "Accept-Language": "ja,en;q=0.9",
};

function curlBinary(): string {
  return process.platform === "win32" ? "curl.exe" : "curl";
}

export async function fetchTextWithCurl(url: string): Promise<string> {
  const { stdout } = await execFileAsync(
    curlBinary(),
    [
      "-s",
      "-L",
      "--compressed",
      "-A",
      DEFAULT_HEADERS["User-Agent"],
      "-H",
      `Accept: ${DEFAULT_HEADERS.Accept}`,
      "-H",
      `Accept-Language: ${DEFAULT_HEADERS["Accept-Language"]}`,
      "-w",
      "\n__HTTP_STATUS__:%{http_code}",
      url,
    ],
    { encoding: "utf8", maxBuffer: 15 * 1024 * 1024 },
  );

  const marker = "\n__HTTP_STATUS__:";
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Empty response: ${url}`);
  }

  const body = stdout.slice(0, markerIndex);
  const status = Number(stdout.slice(markerIndex + marker.length).trim());

  if (!Number.isFinite(status) || status < 200 || status >= 300) {
    throw new Error(`HTTP ${status || "???"}: ${url}`);
  }

  if (!body) {
    throw new Error(`Empty response: ${url}`);
  }

  return body;
}

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.text();
}

export function htmlToLines(html: string): string[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|td|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "");

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parsePrice(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const price = Number(digits);
  return Number.isFinite(price) ? price : null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
