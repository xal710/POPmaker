import {
  canUsePopPlacementOnline,
  POP_PLACEMENT_LAYOUT_VERSION,
  type PopPlacementAssignmentStore,
  type PopPlacementPayload,
} from "../../shared/popPlacement";
import {
  applyPopPlacementPayload,
  readPopPlacementAssignmentStore,
  readPopPlacementLocalUpdatedAt,
} from "./popPlacementStorage";

const API_URL = "/api/pop-placement";
const SYNC_DEBOUNCE_MS = 800;

let syncTimer: number | null = null;
let syncInFlight = false;
let syncQueued = false;

function payloadTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function fetchPopPlacementPayload(): Promise<PopPlacementPayload | null> {
  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`);
    if (!response.ok) return null;
    return (await response.json()) as PopPlacementPayload;
  } catch {
    return null;
  }
}

export async function pushPopPlacementToServer(): Promise<boolean> {
  if (syncInFlight) {
    syncQueued = true;
    return false;
  }

  syncInFlight = true;

  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layoutVersion: POP_PLACEMENT_LAYOUT_VERSION,
        assignments: readPopPlacementAssignmentStore(),
      }),
    });

    if (!response.ok) return false;

    const payload = (await response.json()) as PopPlacementPayload;
    applyPopPlacementPayload(payload);
    return true;
  } catch {
    return false;
  } finally {
    syncInFlight = false;
    if (syncQueued) {
      syncQueued = false;
      void pushPopPlacementToServer();
    }
  }
}

function countAssignments(store: PopPlacementAssignmentStore): number {
  let count = 0;
  for (const wall of Object.values(store)) {
    count += Object.keys(wall).length;
  }
  return count;
}

export async function syncPopPlacementWithServer(options?: {
  forcePull?: boolean;
  forcePush?: boolean;
}): Promise<"pulled" | "pushed" | "noop" | "failed"> {
  const serverPayload = await fetchPopPlacementPayload();
  if (!serverPayload) return "failed";

  const localStore = readPopPlacementAssignmentStore();
  const localCount = countAssignments(localStore);
  const serverCount = countAssignments(serverPayload.assignments);
  const localUpdatedAt = readPopPlacementLocalUpdatedAt();
  const serverTime = payloadTimestamp(serverPayload.updatedAt);
  const localTime = payloadTimestamp(localUpdatedAt);

  if (options?.forcePull) {
    applyPopPlacementPayload(serverPayload);
    return "pulled";
  }

  if (
    options?.forcePush ||
    (localCount > 0 && serverCount === 0) ||
    (localCount > 0 && !localUpdatedAt)
  ) {
    const pushed = await pushPopPlacementToServer();
    return pushed ? "pushed" : "failed";
  }

  if (serverTime > localTime) {
    applyPopPlacementPayload(serverPayload);
    return "pulled";
  }

  if (localTime > serverTime) {
    const pushed = await pushPopPlacementToServer();
    return pushed ? "pushed" : "failed";
  }

  return "noop";
}

export function schedulePopPlacementSync(): void {
  if (syncTimer !== null) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void pushPopPlacementToServer();
  }, SYNC_DEBOUNCE_MS);
}

export function bindPopPlacementOnlineSync(username: string | null | undefined): () => void {
  if (!canUsePopPlacementOnline(username)) {
    return () => {};
  }

  void syncPopPlacementWithServer();

  const onLocalChange = () => {
    schedulePopPlacementSync();
  };

  window.addEventListener("pop-placement-local-change", onLocalChange);

  return () => {
    window.removeEventListener("pop-placement-local-change", onLocalChange);
    if (syncTimer !== null) {
      window.clearTimeout(syncTimer);
      syncTimer = null;
    }
  };
}

export async function restorePopPlacementOnDeploy(): Promise<void> {
  await syncPopPlacementWithServer({ forcePull: true });
}
