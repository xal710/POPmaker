import type {
  PopPlacementAssignmentStore,
  StoredWallSlotPop,
} from "../../shared/popPlacement";
import type { ComparisonItem } from "../types";

export type PopAgeBorderLevel = "yellow" | "orange" | "red";

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function diffCalendarDays(fromDateStr: string, toDate = new Date()): number {
  const from = new Date(`${fromDateStr}T00:00:00`);
  const to = new Date(`${getLocalDateString(toDate)}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function getPopAgeBorderLevel(placedAt: string | undefined): PopAgeBorderLevel | null {
  if (!placedAt) return null;

  const days = diffCalendarDays(placedAt);
  if (days >= 7) return "red";
  if (days >= 5) return "orange";
  if (days >= 3) return "yellow";
  return null;
}

export function findComparisonItemPrice(
  items: ComparisonItem[],
  assignment: Pick<StoredWallSlotPop, "cardName" | "sourceName">,
): number | null {
  const item =
    items.find((entry) => entry.name === assignment.cardName) ??
    items.find((entry) => entry.name === assignment.sourceName);
  return item?.hareruya2 ?? null;
}

export function hasPopPriceMismatch(
  placedPriceYen: number | undefined,
  currentPriceYen: number | null,
): boolean {
  if (placedPriceYen === undefined || currentPriceYen === null) return false;
  return placedPriceYen !== currentPriceYen;
}

export function createStoredWallSlotPop(pending: {
  cardName: string;
  sourceName: string;
  priceYen: number;
  cardImageUrl: string | null;
}): StoredWallSlotPop {
  const placedAt = getLocalDateString();
  return {
    cardName: pending.cardName,
    sourceName: pending.sourceName,
    priceYen: pending.priceYen,
    cardImageUrl: pending.cardImageUrl,
    placedAt,
    placedPriceYen: pending.priceYen,
  };
}

export function getWallSlotIndicatorClassNames(
  assignment: StoredWallSlotPop | undefined,
  currentPriceYen: number | null,
): string {
  if (!assignment) return "";

  const classes: string[] = [];
  const ageLevel = getPopAgeBorderLevel(assignment.placedAt);
  if (ageLevel) {
    classes.push(`wall-face__slot--age-${ageLevel}`);
  }

  const placedPriceYen = assignment.placedPriceYen ?? assignment.priceYen;
  if (hasPopPriceMismatch(placedPriceYen, currentPriceYen)) {
    classes.push("wall-face__slot--price-mismatch");
  }

  return classes.join(" ");
}

export interface PopPlacementStatusSummary {
  stale3Days: number;
  stale5Days: number;
  stale7Days: number;
  priceMismatch: number;
}

function countAssignmentStatus(
  assignment: StoredWallSlotPop,
  comparisonItems: ComparisonItem[],
): Pick<PopPlacementStatusSummary, "stale3Days" | "stale5Days" | "stale7Days" | "priceMismatch"> {
  const result = {
    stale3Days: 0,
    stale5Days: 0,
    stale7Days: 0,
    priceMismatch: 0,
  };

  if (assignment.placedAt) {
    const days = diffCalendarDays(assignment.placedAt);
    if (days >= 3) result.stale3Days = 1;
    if (days >= 5) result.stale5Days = 1;
    if (days >= 7) result.stale7Days = 1;
  }

  const currentPriceYen = findComparisonItemPrice(comparisonItems, assignment);
  const placedPriceYen = assignment.placedPriceYen ?? assignment.priceYen;
  if (hasPopPriceMismatch(placedPriceYen, currentPriceYen)) {
    result.priceMismatch = 1;
  }

  return result;
}

export function summarizePopPlacementStatus(
  store: PopPlacementAssignmentStore,
  comparisonItems: ComparisonItem[],
): PopPlacementStatusSummary {
  const summary: PopPlacementStatusSummary = {
    stale3Days: 0,
    stale5Days: 0,
    stale7Days: 0,
    priceMismatch: 0,
  };

  for (const wall of Object.values(store)) {
    if (!wall || typeof wall !== "object") continue;

    for (const assignment of Object.values(wall)) {
      if (!assignment) continue;

      const counts = countAssignmentStatus(assignment, comparisonItems);
      summary.stale3Days += counts.stale3Days;
      summary.stale5Days += counts.stale5Days;
      summary.stale7Days += counts.stale7Days;
      summary.priceMismatch += counts.priceMismatch;
    }
  }

  return summary;
}

export function hasPopPlacementIssues(summary: PopPlacementStatusSummary): boolean {
  return (
    summary.stale3Days > 0 ||
    summary.stale5Days > 0 ||
    summary.stale7Days > 0 ||
    summary.priceMismatch > 0
  );
}
