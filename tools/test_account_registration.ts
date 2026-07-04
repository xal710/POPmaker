import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  isRegistrationFormComplete,
  isValidDesiredUsername,
  normalizeRegistrationInput,
} from "../shared/accountRegistration";
import {
  accountCanUseTradeFeatures,
  approveAccountApplication,
  isDesiredUsernameTaken,
  rejectAccountApplication,
  submitAccountApplication,
  verifyAccountCredentials,
} from "../server/accountStore";

const dataDir = mkdtempSync(join(tmpdir(), "pop-accounts-test-"));
process.env.DATA_DIR = dataDir;

assert.equal(isValidDesiredUsername("Yousei710"), true);
assert.equal(isValidDesiredUsername("user name"), false);
assert.equal(isValidDesiredUsername("Yousei711"), true);

assert.equal(
  isRegistrationFormComplete({
    displayName: "テスト",
    position: "社員",
    desiredUsername: "testUser1",
    password: "secret",
    contactedAdmin: "yes",
  }),
  true,
);

assert.equal(
  isRegistrationFormComplete({
    displayName: "テスト",
    position: "社員",
    desiredUsername: "testUser1",
    password: "secret",
    contactedAdmin: "",
  }),
  false,
);

const input = normalizeRegistrationInput({
  displayName: "山田太郎",
  store: "本店",
  position: "アルバイト",
  desiredUsername: "yamada01",
  password: "pw1234",
  contactedAdmin: true,
});

assert.ok(input);

const application = submitAccountApplication(input!);
assert.equal(application.status, "pending");
assert.equal(isDesiredUsernameTaken("yamada01"), true);
assert.equal(verifyAccountCredentials("yamada01", "pw1234"), null);

const rejected = rejectAccountApplication(application.id, "administrator");
assert.ok(rejected);
assert.equal(rejected?.status, "rejected");
assert.equal(isDesiredUsernameTaken("yamada01"), true);

const approved = approveAccountApplication(application.id, "administrator", {
  canUsePopPlacement: true,
  canUseTradeFeatures: false,
});
assert.ok(approved);
assert.equal(approved?.status, "approved");
assert.ok(verifyAccountCredentials("yamada01", "pw1234"));
assert.equal(accountCanUseTradeFeatures("yamada01"), false);

rmSync(dataDir, { recursive: true, force: true });

console.log("test_account_registration: OK");
