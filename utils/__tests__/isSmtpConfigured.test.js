const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const isSmtpConfigured = require("../isSmtpConfigured");

describe("isSmtpConfigured", () => {
  it("returns false for injected schema placeholders", () => {
    assert.equal(
      isSmtpConfigured({
        SMPT_HOST: "your-placeholder-value",
        SMPT_MAIL: "your-placeholder-value",
        SMPT_PASSWORD: "your-placeholder-value",
      }),
      false
    );
  });

  it("returns false when host is empty", () => {
    assert.equal(
      isSmtpConfigured({ SMPT_HOST: "", SMPT_MAIL: "a@b.com", SMPT_PASSWORD: "secret" }),
      false
    );
  });

  it("returns true for real remote SMTP settings", () => {
    assert.equal(
      isSmtpConfigured({
        SMPT_HOST: "smtp.gmail.com",
        SMPT_MAIL: "noreply@yebone.com",
        SMPT_PASSWORD: "app-password",
      }),
      true
    );
  });
});
