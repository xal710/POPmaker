export interface PopPlacementZone {
  id: string;
  label: string;
  orientation: "horizontal" | "vertical";
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  detailImage: string;
}

export interface PopPlacementSlot {
  id: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/** 比較リストのPOPモーダルから配置画面へ送るPOPデータ */
export interface PendingPopPlacement {
  cardName: string;
  sourceName: string;
  priceYen: number;
  cardImageUrl: string | null;
}

/** localStorage / サーバーに保存する1スロット分のPOP情報 */
export interface StoredWallSlotPop {
  cardName: string;
  sourceName: string;
  priceYen: number;
  cardImageUrl: string | null;
  /** POPを配置・更新した日（YYYY-MM-DD、ローカル日付） */
  placedAt?: string;
  /** 配置・更新時点の買取価格（晴れる屋2） */
  placedPriceYen?: number;
}

export type PopPlacementAssignmentStore = Record<string, Record<string, StoredWallSlotPop>>;

export const POP_PLACEMENT_LAYOUT_VERSION = 3;

/** 店外POP（line-1）の壁面ID */
export const OUTSIDE_POP_WALL_ID = "line-1";

const REMOVED_OUTSIDE_POP_SLOT_IDS = [
  "line-1-slot-19",
  "line-1-slot-20",
  "line-1-slot-24",
] as const;

const OUTSIDE_POP_SLOT_REMAP_V3: Record<string, string> = {
  "line-1-slot-21": "line-1-slot-19",
  "line-1-slot-22": "line-1-slot-20",
  "line-1-slot-23": "line-1-slot-21",
};

/** 店外POPレイアウト変更（2x3→2x2、右下1枠削除）に伴うスロットID移行 */
export function migratePopPlacementAssignmentsToV3(
  assignments: PopPlacementAssignmentStore,
): PopPlacementAssignmentStore {
  const wall = assignments[OUTSIDE_POP_WALL_ID];
  if (!wall) return assignments;

  const nextWall: Record<string, StoredWallSlotPop> = { ...wall };

  for (const slotId of REMOVED_OUTSIDE_POP_SLOT_IDS) {
    delete nextWall[slotId];
  }

  for (const [fromId, toId] of Object.entries(OUTSIDE_POP_SLOT_REMAP_V3)) {
    const assignment = wall[fromId];
    if (!assignment) continue;
    delete nextWall[fromId];
    nextWall[toId] = assignment;
  }

  return { ...assignments, [OUTSIDE_POP_WALL_ID]: nextWall };
}

export const POP_PLACEMENT_ONLINE_USERNAMES = ["administrator", "Yousei710", "akito00"] as const;

export type PopPlacementOnlineUsername = (typeof POP_PLACEMENT_ONLINE_USERNAMES)[number];

export function canUsePopPlacementOnline(
  username: string | null | undefined,
): username is PopPlacementOnlineUsername {
  if (!username) return false;
  return (POP_PLACEMENT_ONLINE_USERNAMES as readonly string[]).includes(username);
}

export interface PopPlacementPayload {
  layoutVersion: number;
  updatedAt: string;
  updatedBy: string | null;
  assignments: PopPlacementAssignmentStore;
}

export const POP_PLACEMENT_SYNC_EVENT = "pop-placement-sync-applied";

export const POP_PLACEMENT_FLOOR_PLAN = "/pop-placement/floor-plan.png";

export const POP_PLACEMENT_DETAIL_IMAGES = [
  "/pop-placement/details/outside-store-pop.png",
  "/pop-placement/details/wall-face-1.png",
  "/pop-placement/details/wall-face-2.png",
  "/pop-placement/details/wall-face-3.png",
] as const;

export const POP_PLACEMENT_ZONE_LABELS = [
  "店外POP",
  "階段右側POP",
  "階段左側POP",
  "買取フロアPOP",
] as const;

export const POP_PLACEMENT_LINE_COUNT = 4;
