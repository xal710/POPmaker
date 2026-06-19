export interface CardImageData {
  imageUrl: string | null;
  productTitle: string | null;
  searchQuery: string | null;
  productId: string | null;
  cached: boolean;
}

type CacheEntry =
  | { status: "loading"; promise: Promise<CardImageData> }
  | { status: "success"; data: CardImageData }
  | { status: "error"; message: string };

const cache = new Map<string, CacheEntry>();
const MAX_CONCURRENT = 4;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

function runQueued(): void {
  while (activeCount < MAX_CONCURRENT && waitQueue.length > 0) {
    const next = waitQueue.shift();
    next?.();
  }
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeCount += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeCount -= 1;
          runQueued();
        });
    };

    if (activeCount < MAX_CONCURRENT) {
      run();
      return;
    }

    waitQueue.push(run);
  });
}

async function requestCardImage(cardName: string): Promise<CardImageData> {
  const params = new URLSearchParams({ name: cardName });
  const response = await fetch(`/api/card-image?${params}`);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as CardImageData;
}

export function getCardImageCacheEntry(cardName: string): CacheEntry | undefined {
  return cache.get(cardName);
}

export function loadCardImageData(cardName: string): Promise<CardImageData> {
  const existing = cache.get(cardName);
  if (existing?.status === "success") {
    return Promise.resolve(existing.data);
  }
  if (existing?.status === "loading") {
    return existing.promise;
  }

  const promise = schedule(() => requestCardImage(cardName))
    .then((data) => {
      cache.set(cardName, { status: "success", data });
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
