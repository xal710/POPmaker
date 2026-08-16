import assert from "node:assert/strict";

import {
  hasCardRushSourceChange,
  hasComparisonSourceChange,
  type ComparisonSourceVersions,
} from "../server/comparisonSourceWatch";

function versions(overrides: Partial<ComparisonSourceVersions> = {}): ComparisonSourceVersions {
  return {
    cardRushUpdatedAt: "07/03 21:30",
    cardRushLastPage: 120,
    hareruyaUpdatedAt: "2026-07-03",
    ...overrides,
  };
}

assert.equal(hasComparisonSourceChange(versions(), versions()), false);

assert.equal(
  hasComparisonSourceChange(
    versions(),
    versions({ cardRushUpdatedAt: "07/03 22:00" }),
  ),
  true,
  "CR updatedAt が変われば更新",
);

assert.equal(
  hasComparisonSourceChange(
    versions(),
    versions({ cardRushLastPage: 121 }),
  ),
  true,
  "CR lastPage が変われば更新",
);

assert.equal(
  hasComparisonSourceChange(
    versions(),
    versions({ hareruyaUpdatedAt: "2026-07-04" }),
  ),
  true,
  "晴れる屋 updatedAt が変われば更新",
);

assert.equal(
  hasComparisonSourceChange(
    versions({ cardRushUpdatedAt: null, hareruyaUpdatedAt: null }),
    versions(),
  ),
  false,
  "初回ベースライン確立時は更新しない",
);

assert.equal(
  hasComparisonSourceChange(versions(), versions({ cardRushUpdatedAt: null })),
  false,
  "CR updatedAt が取れない場合は更新しない",
);

assert.equal(
  hasCardRushSourceChange(
    versions(),
    versions({ hareruyaUpdatedAt: "2026-07-04" }),
  ),
  false,
  "晴れる屋だけの変化では CR 全件更新しない",
);

console.log("test_comparison_source_watch: OK");
