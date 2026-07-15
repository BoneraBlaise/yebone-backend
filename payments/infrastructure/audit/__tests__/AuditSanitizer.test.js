const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const AuditSanitizer = require("../AuditSanitizer");
const AuditHelper = require("../AuditHelper");
const { isValidAction } = require("../AuditEvent");

describe("AuditSanitizer", () => {
  it("redacts forbidden keys", () => {
    const sanitized = AuditSanitizer.sanitize({
      password: "secret123",
      token: "abc",
      status: "ok",
    });
    assert.equal(sanitized.password, "[REDACTED]");
    assert.equal(sanitized.token, "[REDACTED]");
    assert.equal(sanitized.status, "ok");
  });

  it("redacts JWT-like strings", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature";
    const sanitized = AuditSanitizer.sanitize({ value: jwt });
    assert.equal(sanitized.value, "[REDACTED]");
  });

  it("redacts card-like numbers", () => {
    const sanitized = AuditSanitizer.sanitize({ card: "4111111111111111" });
    assert.equal(sanitized.card, "[REDACTED]");
  });
});

describe("AuditHelper", () => {
  it("generates audit ids with prefix", () => {
    const id = AuditHelper.generateAuditId();
    assert.match(id, /^aud_/);
  });

  it("validates extensible action names", () => {
    assert.equal(isValidAction("CUSTOM_EVENT_V2"), true);
    assert.equal(isValidAction("bad action"), false);
  });
});
