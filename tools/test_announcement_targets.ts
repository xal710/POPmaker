import {
  isAnnouncementVisibleToUser,
  normalizeAnnouncementTargets,
  resolveAnnouncementTargetSelection,
} from "../shared/admin";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("NG", message);
    process.exit(1);
  }
}

const accounts = ["administrator", "Yousei710", "akito00"];

assert(
  isAnnouncementVisibleToUser(
    { announcement: "hello", announcementTargets: null },
    "Yousei710",
  ),
  "null targets visible to all",
);
assert(
  isAnnouncementVisibleToUser(
    { announcement: "hello", announcementTargets: ["Yousei710"] },
    "Yousei710",
  ),
  "selected user visible",
);
assert(
  !isAnnouncementVisibleToUser(
    { announcement: "hello", announcementTargets: ["Yousei710"] },
    "akito00",
  ),
  "unselected user hidden",
);
assert(
  !isAnnouncementVisibleToUser(
    { announcement: "hello", announcementTargets: [] },
    "Yousei710",
  ),
  "empty targets hidden",
);

assert(
  normalizeAnnouncementTargets(["Yousei710", "akito00", "administrator"], accounts) === null,
  "all selected becomes null",
);
assert(
  JSON.stringify(normalizeAnnouncementTargets(["Yousei710"], accounts)) ===
    JSON.stringify(["Yousei710"]),
  "partial selection kept",
);

const selection = resolveAnnouncementTargetSelection(null, accounts);
assert(selection.size === 3 && selection.has("Yousei710"), "null resolves to all");

console.log("OK announcement targets");
