const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { invalidateUserSessions } = require("../sessionInvalidation");

describe("sessionInvalidation", () => {
  it("increments tokenVersion from 0", () => {
    const user = { tokenVersion: 0 };
    assert.equal(invalidateUserSessions(user), 1);
    assert.equal(user.tokenVersion, 1);
  });

  it("increments existing tokenVersion", () => {
    const user = { tokenVersion: 3 };
    assert.equal(invalidateUserSessions(user), 4);
  });
});
