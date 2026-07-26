const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const CommunicationAccess = require("../CommunicationAccess");
const { createCommunicationRateLimiter } = require("../CommunicationRateLimit");
const CommunicationOfferService = require("../CommunicationOfferService");
const CommunicationInboxBridge = require("../CommunicationInboxBridge");

describe("Phase 15 Communication Production Acceptance", () => {
  describe("CommunicationAccess", () => {
    it("requires buyer authentication", () => {
      assert.throws(() => CommunicationAccess.assertBuyer({}), /Buyer authentication required/);
      assert.equal(CommunicationAccess.assertBuyer({ user: { _id: "buyer_1" } }), "buyer_1");
    });

    it("rejects missing cron secret configuration", () => {
      delete process.env.COMMUNICATION_CRON_SECRET;
      assert.throws(() => CommunicationAccess.assertCronSecret({ headers: {} }), /not configured/);
    });

    it("validates cron secret header", () => {
      process.env.COMMUNICATION_CRON_SECRET = "test-secret";
      assert.throws(
        () => CommunicationAccess.assertCronSecret({ headers: { "x-cron-secret": "wrong" } }),
        /Unauthorized cron request/
      );
      assert.equal(
        CommunicationAccess.assertCronSecret({ headers: { "x-cron-secret": "test-secret" } }),
        true
      );
    });

    it("sanitizes and validates message text", () => {
      assert.equal(CommunicationAccess.sanitizeMessageText("  hello  "), "hello");
      assert.throws(() => CommunicationAccess.sanitizeMessageText("   "), /required/);
    });
  });

  describe("CommunicationRateLimit", () => {
    it("blocks excessive requests", () => {
      const limiter = createCommunicationRateLimiter({ windowMs: 60_000, max: 2, keyPrefix: "test" });
      const req = { method: "POST", baseUrl: "/api", path: "/messages", ip: "1.1.1.1", user: { _id: "u1" } };
      const results = [];
      limiter(req, { status: () => ({ json: (body) => results.push(body) }) }, () => results.push("ok"));
      limiter(req, { status: () => ({ json: (body) => results.push(body) }) }, () => results.push("ok"));
      limiter(req, { status: () => ({ json: (body) => results.push(body) }) }, () => results.push("ok"));
      assert.equal(results.filter((r) => r === "ok").length, 2);
      assert.equal(results.some((r) => r?.success === false), true);
    });
  });

  describe("CommunicationOfferService authorization", () => {
    let offerService;

    beforeEach(() => {
      offerService = new CommunicationOfferService({
        inboxBridge: new CommunicationInboxBridge(),
        notificationService: null,
      });
    });

    it("rejects seller creating offer on own product", async () => {
      offerService._loadProduct = async () => ({ _id: "p1", shopId: "seller_1", stock: 5, name: "Item" });
      await assert.rejects(
        () => offerService.createOffer("seller_1", { productId: "p1", amount: 1000 }),
        (error) => error.statusCode === 403
      );
    });
  });
});
