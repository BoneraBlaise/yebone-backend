const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseJwtExpiresMs, getJwtExpiresDate } = require("../jwtExpires");

describe("jwtExpires", () => {
  it("parses day suffix", () => {
    assert.equal(parseJwtExpiresMs("7d"), 7 * 24 * 60 * 60 * 1000);
  });

  it("parses hour suffix", () => {
    assert.equal(parseJwtExpiresMs("24h"), 24 * 60 * 60 * 1000);
  });

  it("getJwtExpiresDate aligns with parsed duration", () => {
    const before = Date.now();
    const date = getJwtExpiresDate(before);
    assert.equal(date.getTime() - before, parseJwtExpiresMs(process.env.JWT_EXPIRES || "7d"));
  });
});
