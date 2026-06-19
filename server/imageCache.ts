const PROXY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "image/*",
};

const IMAGE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_IMAGE_CACHE_ENTRIES = 200;

interface ImageCacheEntry {
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

const imageBufferCache = new Map<string, ImageCacheEntry>();

function trimImageCache(): void {
  if (imageBufferCache.size <= MAX_IMAGE_CACHE_ENTRIES) return;

  const overflow = imageBufferCache.size - MAX_IMAGE_CACHE_ENTRIES;
  const keys = imageBufferCache.keys();
  for (let i = 0; i < overflow; i += 1) {
    const next = keys.next();
    if (next.done) break;
    imageBufferCache.delete(next.value);
  }
}

export function getCachedImage(imageUrl: string): ImageCacheEntry | null {
  const cached = imageBufferCache.get(imageUrl);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    imageBufferCache.delete(imageUrl);
    return null;
  }
  return cached;
}

export async function prefetchImage(imageUrl: string): Promise<void> {
  if (getCachedImage(imageUrl)) return;

  const response = await fetch(imageUrl, { headers: PROXY_HEADERS });
  if (!response.ok) return;

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  imageBufferCache.set(imageUrl, {
    buffer,
    contentType,
    expiresAt: Date.now() + IMAGE_CACHE_TTL_MS,
  });
  trimImageCache();
}

export async function fetchImageBuffer(
  imageUrl: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cached = getCachedImage(imageUrl);
  if (cached) {
    return { buffer: cached.buffer, contentType: cached.contentType };
  }

  try {
    await prefetchImage(imageUrl);
  } catch {
    return null;
  }

  const next = getCachedImage(imageUrl);
  if (!next) return null;
  return { buffer: next.buffer, contentType: next.contentType };
}
