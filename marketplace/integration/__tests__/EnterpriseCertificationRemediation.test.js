const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const OrderPricingService = require("../pricing/OrderPricingService");
const PlatformAuthService = require("../auth/PlatformAuthService");
const PlatformAuditService = require("../audit/PlatformAuditService");
const PlatformAuditAdapter = require("../audit/PlatformAuditAdapter");
const { PlatformFeatureFlagService, PlatformFeatureFlagStore } = require("../features/PlatformFeatureFlagService");
const { createPlatformIntegration } = require("../PlatformIntegration");
const OrderPaymentBridge = require("../bridges/OrderPaymentBridge");
const OrderDeliveryBridge = require("../bridges/OrderDeliveryBridge");
const DeliveryStateMachine = require("../../delivery/DeliveryStateMachine");
const ReferralAttributionService = require("../../growth/ReferralAttributionService");
const FinancialAuditService = require("../../../payments/financial/audit/FinancialAuditService");
const CourierSecurity = require("../../delivery/courier/CourierSecurity");
const SearchConfiguration = require("../../search/SearchConfiguration");
const AIConfiguration = require("../../ai/AIConfiguration");

describe("Enterprise Certification Remediation Phase 9.2.1", () => {
  before(() => {
    process.env.REFERRAL_ATTRIBUTION_SECRET = process.env.REFERRAL_ATTRIBUTION_SECRET || "test-attribution-secret";
    process.env.NODE_ENV = "test";
  });

  it("PlatformIntegration reports remediation phase", async () => {
    const integration = createPlatformIntegration({ useMemoryOnly: true });
    await integration.initialize();
    assert.equal(integration.getHealth().phase, "9.2.1");
  });

  it("PlatformAuditService stores resource field", async () => {
    const audit = new PlatformAuditService({ useMemoryOnly: true });
    const entry = await audit.record({
      platform: "orders",
      resource: "order_123",
      actor: "tester",
      action: "test.action",
      correlationId: "corr_1",
      oldValue: 1,
      newValue: 2,
      reason: "unit_test",
    });
    assert.equal(entry.resource, "order_123");
    assert.ok(entry.timestamp);
  });

  it("OrderPricingService calculates server-side tax", () => {
    process.env.ORDER_TAX_RATE = "0.18";
    const pricing = new OrderPricingService();
    const totals = pricing.buildOrderTotals({ subtotal: 1000, shipping: 100, discount: 100 });
    assert.equal(totals.taxAmount, 162);
    assert.equal(totals.total, 1162);
  });

  it("OrderPaymentBridge requires authoritative paymentId for refund", async () => {
    const bridge = new OrderPaymentBridge({ audit: new PlatformAuditService({ useMemoryOnly: true }) });
    await assert.rejects(
      () =>
        bridge.processRefund(
          { _id: "507f1f77bcf86cd799439011", totalPrice: 100, paymentInfo: {} },
          { correlationId: "refund_test" }
        ),
      (error) => error.statusCode === 400 && /paymentId/i.test(error.message)
    );
  });

  it("OrderDeliveryBridge maps delivery DELIVERED to order Delivered", () => {
    const bridge = new OrderDeliveryBridge({ featureFlags: { isEnabledSync: () => true } });
    assert.equal(
      bridge.mapDeliveryStatusToOrder(DeliveryStateMachine.STATUS.DELIVERED),
      "Delivered"
    );
  });

  it("Platform feature flags override growth domain settings in production-linked stores", async () => {
    const integration = createPlatformIntegration({ useMemoryOnly: true });
    await integration.initialize();
    await integration.featureFlags.store.updateFlags({
      growth: { coupons: { enabled: false } },
    });
    await integration.featureFlags.refresh();
    assert.equal(await integration.featureFlags.isEnabled("growth", "coupons.enabled"), false);
    assert.equal(await integration.featureFlags.isEnabled("growth", "referral.enabled"), true);
  });

  it("ReferralAttributionService rejects missing secret in production", () => {
    const previousEnv = process.env.NODE_ENV;
    const previousSecret = process.env.REFERRAL_ATTRIBUTION_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.REFERRAL_ATTRIBUTION_SECRET;

    assert.throws(() => new ReferralAttributionService(), /REFERRAL_ATTRIBUTION_SECRET/);

    process.env.NODE_ENV = previousEnv;
    process.env.REFERRAL_ATTRIBUTION_SECRET = previousSecret || "test-attribution-secret";
  });

  it("PlatformAuthService normalizes Admin role for middleware parity", () => {
    assert.equal(PlatformAuthService.normalizeRole("Admin"), "admin");
    const auth = PlatformAuthService.assertSuperAdmin({ user: { _id: "1", role: "Admin" } });
    assert.equal(auth.valid, true);
  });

  it("CourierSecurity delegates admin checks to PlatformAuthService", () => {
    const admin = CourierSecurity.assertAdmin({ user: { _id: "a1", role: "Admin" } });
    assert.equal(admin.valid, true);
    const user = CourierSecurity.assertAdmin({ user: { _id: "u1", role: "user" } });
    assert.equal(user.valid, false);
  });

  it("FinancialAuditService delegates to PlatformAuditAdapter", () => {
    const financial = new FinancialAuditService();
    const entry = financial.recordPayment("capture", "pay_1", { amount: 100 }, { correlationId: "c1" });
    assert.equal(entry.category, "payment");
    assert.equal(entry.aggregateId, "pay_1");
  });

  it("Search and AI configurations resolve runtime platform flags", () => {
    assert.equal(typeof new SearchConfiguration().isRuntimeEnabled(), "boolean");
    assert.equal(typeof new AIConfiguration().isRuntimeEnabled(), "boolean");
  });

  it("PlatformFeatureFlagService remains centralized runtime authority", async () => {
    const flags = new PlatformFeatureFlagService({
      store: new PlatformFeatureFlagStore({ useMemoryOnly: true }),
    });
    await flags.refresh();
    assert.equal(await flags.isEnabled("growth", "referral.enabled"), true);
    assert.equal(await flags.isEnabled("delivery", "autoAssignment.enabled"), false);
  });

  it("PlatformAuditAdapter forwards configuration audit events", async () => {
    const integration = createPlatformIntegration({ useMemoryOnly: true });
    await integration.initialize();
    const entry = await PlatformAuditAdapter.recordConfiguration({
      platform: "growth",
      resource: "coupons",
      action: "settings.update",
      actor: "admin",
      oldValue: { enabled: true },
      newValue: { enabled: false },
      reason: "test",
    });
    assert.equal(entry.platform, "growth");
    assert.equal(entry.action, "settings.update");
  });
});
