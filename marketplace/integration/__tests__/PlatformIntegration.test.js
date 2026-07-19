const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const OrderPricingService = require("../pricing/OrderPricingService");
const PlatformAuthService = require("../auth/PlatformAuthService");
const PlatformAuditService = require("../audit/PlatformAuditService");
const { PlatformFeatureFlagService, PlatformFeatureFlagStore } = require("../features/PlatformFeatureFlagService");
const { createPlatformIntegration } = require("../PlatformIntegration");
const OrderPaymentBridge = require("../bridges/OrderPaymentBridge");

describe("Platform Integration Phase 9.2", () => {
  before(() => {
    process.env.REFERRAL_ATTRIBUTION_SECRET = process.env.REFERRAL_ATTRIBUTION_SECRET || "test-attribution-secret";
  });

  it("PlatformAuthService normalizes legacy Admin role", () => {
    assert.equal(PlatformAuthService.normalizeRole("Admin"), "admin");
    assert.equal(PlatformAuthService.isSuperAdmin("super-admin"), true);
  });

  it("PlatformAuditService records immutable audit tuples", async () => {
    const audit = new PlatformAuditService({ useMemoryOnly: true });
    const entry = await audit.record({
      platform: "orders",
      actor: "tester",
      action: "test.action",
      oldValue: 1,
      newValue: 2,
      reason: "unit_test",
      correlationId: "corr_test",
      orderId: "order_1",
    });
    assert.equal(entry.platform, "orders");
    assert.equal(entry.oldValue, 1);
    assert.equal(entry.newValue, 2);
    assert.ok(entry.timestamp);
  });

  it("PlatformFeatureFlagService exposes centralized flags", async () => {
    const flags = new PlatformFeatureFlagService({
      store: new PlatformFeatureFlagStore({ useMemoryOnly: true }),
    });
    await flags.refresh();
    assert.equal(await flags.isEnabled("search"), true);
    assert.equal(await flags.isEnabled("ai"), true);
  });

  it("OrderPricingService resolves brand and server unit price from product payload", async () => {
    const pricing = new OrderPricingService({ audit: new PlatformAuditService({ useMemoryOnly: true }) });
    const product = {
      _id: "507f1f77bcf86cd799439011",
      name: "Server Priced Product",
      category: "electronics",
      tags: "BrandX",
      brand: "BrandX",
      originalPrice: 1000,
      discountPrice: 800,
      stock: 10,
      shopId: "shop1",
    };

    pricing.loadProduct = async () => product;
    const repriced = await pricing.repriceCart(
      [{ _id: product._id, shopId: product.shopId, price: 1, qty: 2 }],
      { correlationId: "repricing_test" }
    );

    assert.equal(repriced.subtotal, 1600);
    assert.equal(repriced.items[0].serverPrice, 800);
    assert.notEqual(repriced.items[0].price, 1);
  });

  it("OrderPaymentBridge fails loudly when payment is not coordinated", async () => {
    const bridge = new OrderPaymentBridge({
      audit: new PlatformAuditService({ useMemoryOnly: true }),
    });

    await assert.rejects(
      () =>
        bridge.prepareOrderPayments(
          [{ _id: "507f1f77bcf86cd799439011", totalPrice: 100, paymentInfo: { type: "CARD" } }],
          { _id: "user1" },
          { correlationId: "pay_test" }
        ),
      (error) => error.statusCode === 502 || /Payment/i.test(error.message)
    );
  });

  it("PlatformIntegration composition root initializes", async () => {
    const integration = createPlatformIntegration({ useMemoryOnly: true });
    await integration.initialize();
    assert.equal(integration.getHealth().phase, "9.2.1");
    assert.ok(integration.pricing);
    assert.ok(integration.paymentBridge);
    assert.ok(integration.audit);
  });
});
