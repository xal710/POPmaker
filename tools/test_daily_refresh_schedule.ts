import assert from "node:assert/strict";

import {
  getJstParts,
  shouldTriggerDailyRefresh,
  type DailyRefreshScheduleState,
} from "../server/dailyRefreshSchedule";

const empty: DailyRefreshScheduleState = {
  lastTriggeredDate: null,
  lastTriggeredAt: null,
};

// 2026-07-14 06:59 JST = 2026-07-13 21:59 UTC
assert.equal(
  shouldTriggerDailyRefresh(empty, new Date("2026-07-13T21:59:00.000Z"), {
    hour: 7,
    minute: 0,
    catchupUntilHour: 12,
  }),
  false,
);

// 2026-07-14 07:00 JST
assert.equal(
  shouldTriggerDailyRefresh(empty, new Date("2026-07-13T22:00:00.000Z"), {
    hour: 7,
    minute: 0,
    catchupUntilHour: 12,
  }),
  true,
);

// already triggered today
assert.equal(
  shouldTriggerDailyRefresh(
    { lastTriggeredDate: "2026-07-14", lastTriggeredAt: "2026-07-13T22:00:00.000Z" },
    new Date("2026-07-13T22:30:00.000Z"),
    { hour: 7, minute: 0, catchupUntilHour: 12 },
  ),
  false,
);

// catch-up still open at 09:30 JST
assert.equal(
  shouldTriggerDailyRefresh(empty, new Date("2026-07-14T00:30:00.000Z"), {
    hour: 7,
    minute: 0,
    catchupUntilHour: 12,
  }),
  true,
);

// after catch-up window 12:01 JST
assert.equal(
  shouldTriggerDailyRefresh(empty, new Date("2026-07-14T03:01:00.000Z"), {
    hour: 7,
    minute: 0,
    catchupUntilHour: 12,
  }),
  false,
);

const parts = getJstParts(new Date("2026-07-13T22:00:00.000Z"));
assert.equal(parts.dateKey, "2026-07-14");
assert.equal(parts.hour, 7);
assert.equal(parts.minute, 0);

console.log("OK daily refresh schedule");
