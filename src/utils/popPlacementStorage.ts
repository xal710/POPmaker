import {
  POP_PLACEMENT_SYNC_EVENT,
  type PopPlacementAssignmentStore,
  type PopPlacementPayload,
  type StoredWallSlotPop,
} from "../../shared/popPlacement";

export type { StoredWallSlotPop };

const STORAGE_KEY = "pop-placement-assignments-v2";
const META_STORAGE_KEY = "pop-placement-meta-v2";

interface PopPlacementMeta {
  updatedAt: string;
  syncedAt: string | null;
}

function readMeta(): PopPlacementMeta | null {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PopPlacementMeta;
    if (!parsed || typeof parsed.updatedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeMeta(meta: PopPlacementMeta): void {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
}

function readStore(): PopPlacementAssignmentStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PopPlacementAssignmentStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(
  store: PopPlacementAssignmentStore,
  options?: { syncedAt?: string | null; silent?: boolean },
): void {
  const meta = readMeta();
  const updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  writeMeta({
    updatedAt: options?.syncedAt ?? updatedAt,
    syncedAt: options?.syncedAt ?? meta?.syncedAt ?? null,
  });

  if (!options?.silent) {
    window.dispatchEvent(new CustomEvent("pop-placement-local-change"));
  }
}

export function readPopPlacementAssignmentStore(): PopPlacementAssignmentStore {
  return readStore();
}

export function readPopPlacementLocalUpdatedAt(): string | null {
  return readMeta()?.updatedAt ?? null;
}

export function applyPopPlacementPayload(payload: PopPlacementPayload): void {
  writeStore(payload.assignments, { syncedAt: payload.updatedAt, silent: true });
  window.dispatchEvent(new CustomEvent(POP_PLACEMENT_SYNC_EVENT));
}

export function getWallSlotAssignments(wallId: string): Record<string, StoredWallSlotPop> {
  return readStore()[wallId] ?? {};
}

export function getWallSlotAssignment(wallId: string, slotId: string): StoredWallSlotPop | null {
  return getWallSlotAssignments(wallId)[slotId] ?? null;
}

export function saveWallSlotAssignment(
  wallId: string,
  slotId: string,
  assignment: StoredWallSlotPop,
): void {
  const store = readStore();
  const wall = { ...(store[wallId] ?? {}) };
  wall[slotId] = assignment;
  store[wallId] = wall;
  writeStore(store);
}

export function removeWallSlotAssignment(wallId: string, slotId: string): void {
  const store = readStore();
  const wall = { ...(store[wallId] ?? {}) };
  delete wall[slotId];
  store[wallId] = wall;
  writeStore(store);
}

export function moveWallSlotAssignment(
  wallId: string,
  fromSlotId: string,
  toSlotId: string,
): void {
  if (fromSlotId === toSlotId) return;

  const store = readStore();
  const wall = { ...(store[wallId] ?? {}) };
  const fromAssignment = wall[fromSlotId];
  if (!fromAssignment) return;

  const toAssignment = wall[toSlotId];
  delete wall[fromSlotId];
  wall[toSlotId] = fromAssignment;
  if (toAssignment) {
    wall[fromSlotId] = toAssignment;
  }

  store[wallId] = wall;
  writeStore(store);
}

export function replacePopPlacementAssignmentStore(store: PopPlacementAssignmentStore): void {
  writeStore(store);
}
