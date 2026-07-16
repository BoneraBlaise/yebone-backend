const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const AuthorizationRedactor = require("../security/AuthorizationRedactor");

describe("AuthorizationRedactor", () => {
  it("redacts authorization headers", () => {
    const headers = AuthorizationRedactor.redactHeaders({
      Authorization: "Bearer secret-token",
      "Ocp-Apim-Subscription-Key": "sub-key",
      "Content-Type": "application/json",
    });

    assert.equal(headers.Authorization, "[REDACTED]");
    assert.equal(headers["Ocp-Apim-Subscription-Key"], "[REDACTED]");
    assert.equal(headers["Content-Type"], "application/json");
  });

  it("detects bearer and basic authorization values", () => {
    assert.equal(AuthorizationRedactor.containsAuthorization("Bearer abc"), true);
    assert.equal(AuthorizationRedactor.containsAuthorization("Basic abc"), true);
    assert.equal(AuthorizationRedactor.containsAuthorization("plain"), false);
  });
});
