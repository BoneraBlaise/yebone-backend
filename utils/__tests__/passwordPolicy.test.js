const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  validatePasswordPolicy,
  isPasswordPolicyValid,
} = require("../passwordPolicy");

describe("passwordPolicy", () => {
  it("accepts a strong password", () => {
    assert.equal(isPasswordPolicyValid("Secure1!pass"), true);
  });

  it("rejects short passwords", () => {
    const result = validatePasswordPolicy("Ab1!");
    assert.equal(result.valid, false);
    assert.match(result.errors[0], /8 characters/);
  });

  it("rejects missing uppercase", () => {
    const result = validatePasswordPolicy("secure1!pass");
    assert.equal(result.valid, false);
  });

  it("rejects missing special character", () => {
    const result = validatePasswordPolicy("Secure1pass");
    assert.equal(result.valid, false);
  });
});
