const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isTokenVersionValid } = require("../../middleware/auth");

describe("isTokenVersionValid", () => {
  it("accepts matching token version", () => {
    assert.equal(isTokenVersionValid({ tv: 2 }, { tokenVersion: 2 }), true);
  });

  it("rejects stale token version", () => {
    assert.equal(isTokenVersionValid({ tv: 1 }, { tokenVersion: 2 }), false);
  });

  it("treats missing tv as 0", () => {
    assert.equal(isTokenVersionValid({}, { tokenVersion: 0 }), true);
    assert.equal(isTokenVersionValid({}, { tokenVersion: 1 }), false);
  });
});
