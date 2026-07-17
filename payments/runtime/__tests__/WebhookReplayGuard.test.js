const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const WebhookReplayGuard = require("../webhooks/WebhookReplayGuard");

describe("WebhookReplayGuard", () => {
  it("allows events within replay window", () => {
    const guard = new WebhookReplayGuard({ replayWindowSeconds: 3600 });
    const recent = new Date(Date.now() - 60_000);
    const result = guard.assertWithinWindow({ eventTimestamp: recent });
    assert.equal(result.allowed, true);
  });

  it("rejects events outside replay window", () => {
    const guard = new WebhookReplayGuard({ replayWindowSeconds: 60 });
    const stale = new Date(Date.now() - 120_000);
    const result = guard.assertWithinWindow({ eventTimestamp: stale });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "REPLAY_WINDOW_EXCEEDED");
  });

  it("allows missing timestamp", () => {
    const guard = new WebhookReplayGuard();
    const result = guard.assertWithinWindow({});
    assert.equal(result.allowed, true);
  });
});
