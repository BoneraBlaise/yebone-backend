const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const {
  hashPasswordIfNeeded,
  isBcryptHash,
} = require("../hashPasswordIfNeeded");

describe("hashPasswordIfNeeded", () => {
  it("hashes plaintext passwords", async () => {
    const hash = await hashPasswordIfNeeded("secret123");
    assert.ok(isBcryptHash(hash));
    assert.ok(await bcrypt.compare("secret123", hash));
  });

  it("does not re-hash an existing bcrypt hash (regression guard)", async () => {
    const original = await bcrypt.hash("keep-me-valid", 10);
    const result = await hashPasswordIfNeeded(original);
    assert.equal(result, original);
    assert.ok(await bcrypt.compare("keep-me-valid", result));
  });

  it("isBcryptHash rejects plaintext", () => {
    assert.equal(isBcryptHash("plaintext"), false);
  });
});
