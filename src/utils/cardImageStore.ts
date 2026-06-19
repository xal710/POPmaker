export interface CardImageData {
  imageUrl: string | null;
  productTitle: string | null;
  searchQuery: string | null;
  productId: string | null;
  cached: boolean;
}

export type CardImagePriority = "high" | "normal";

type CacheEntry =
  | { status: "loading"; promise: Promise<CardImageData> }
  | { status: "success"; data: CardImageData };

const cache = new Map<string, CacheEntry>();
const MAX_CONCURRENT = 6;
const MAX_HIGH_PRIORITY = 2;
let activeCount = 0;
let activeHighCount = 0;
const highQueue: Array<() => void> = [];
const normalQueue: Array<() => void> = [];

function runQueued(): void {
  while (activeCount < MAX_CONCURRENT) {
    let next: (() => void) | undefined;

    if (activeHighCount < MAX_HIGH_PRIORITY && highQueue.length > 0) {
      next = highQueue.shift();
    } else if (normalQueue.length > 0) {
      next = normalQueue.shift();
    } else if (highQueue.length > 0) {
      next = highQueue.shift();
    } else {
      break;
    }

    next?.();
  }
}

function schedule<T>(task: () => Promise<T>, priority: CardImagePriority): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeCount += 1;
      if (priority === "high") activeHighCount += 1;

      task()
        .then(resolve, reject)
        .finally(() => {
          activeCount -= 1;
          if (priority === "high") activeHighCount -= 1;
          runQueued();
        });
    };

    const canRunNow =
      activeCount < MAX_CONCURRENT &&
      (priority === "normal" || activeHighCount < MAX_HIGH_PRIORITY);

    if (canRunNow) {
      run();
      return;
    }

    if (priority === "high") {
      highQueue.push(run);
    } else {
      normalQueue.push(run);
    }
  });
}

async function requestCardImage(cardName: string, refresh = false): Promise<CardImageData> {
  const params = new URLSearchParams({ name: cardName });
  if (refresh) {
    params.set("refresh", "1");
  }
  const response = await fetch(`/api/card-image?${params}`);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as CardImageData;
}

function shouldReuseCachedData(data: CardImageData): boolean {
  return Boolean(data.imageUrl);
}

export function getCardImageCacheEntry(cardName: string): CacheEntry | undefined {
  const entry = cache.get(cardName);
  if (entry?.status === "success" && !shouldReuseCachedData(entry.data)) {
    return undefined;
  }
  return entry;
}

export function loadCardImageData(
  cardName: string,
  priority: CardImagePriority = "normal",
): Promise<CardImageData> {
  const existing = getCardImageCacheEntry(cardName);
  if (existing?.status === "success") {
    return Promise.resolve(existing.data);
  }
  if (existing?.status === "loading") {
    return existing.promise;
  }

  const promise = schedule(() => requestCardImage(cardName), priority)
    .then((data) => {
      if (shouldReuseCachedData(data)) {
        cache.set(cardName, { status: "success", data });
      } else {
        cache.delete(cardName);
      }
      return data;
    })
    .catch((error) => {
      cache.delete(cardName);
      throw error;
    });

  cache.set(cardName, { status: "loading", promise });
  return promise;
}

export function refreshCardImageData(
  cardName: string,
  priority: CardImagePriority = "normal",
): Promise<CardImageData> {
  cache.delete(cardName);

  const promise = schedule(() => requestCardImage(cardName, true), priority)
    .then((data) => {
      if (shouldReuseCachedData(data)) {
        cache.set(cardName, { status: "success", data });
      } else {
        cache.delete(cardName);
      }
      return data;
    })
    .catch((error) => {
      cache.delete(cardName);
      throw error;
    });

  cache.set(cardName, { status: "loading", promise });
  return promise;
}

export function resolveCardImageProxyUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}
