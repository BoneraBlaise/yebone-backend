const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const GrowthConfigurationPlatform = require("../GrowthConfigurationPlatform");
const CommissionRuleAdminService = require("../CommissionRuleAdminService");
const CommissionRuleSimulatorService = require("../CommissionRuleSimulatorService");
const CouponValidationService = require("../CouponValidationService");

describe("CommissionRuleAdminService", () => {
  let admin;

  beforeEach(async () => {
    const platform = new GrowthConfigurationPlatform({ storeOptions: { useMemoryOnly: true } });
    await platform.initialize();
    admin = new CommissionRuleAdminService({
      store: platform.getStore(),
      audit: platform.audit,
      analytics: platform.analytics,
    });
  });

  it("creates, updates, duplicates, archives, and restores rules", async () => {
    const created = await admin.create(
      {
        name: "Phones Category",
        strategy: "CATEGORY",
        rate: 5,
        scope: { categoryId: "phones" },
        priority: 5,
      },
      { admin: "admin-1", reason: "Launch phones rate" }
    );
    assert.equal(created.strategy, "CATEGORY");

    const updated = await admin.update(
      created.id,
      { rate: 6, reason: "Adjust phones rate" },
      { admin: "admin-1" }
    );
    assert.equal(updated.rate, 6);

    const duplicate = await admin.duplicate(created.id, { admin: "admin-1" });
    assert.notEqual(duplicate.id, created.id);

    await admin.archive(created.id, { admin: "admin-1" });
    assert.equal(admin.getById(created.id).archived, true);

    await admin.restore(created.id, { admin: "admin-1" });
    assert.equal(admin.getById(created.id).archived, false);
  });

  it("supports configurable priorities and brand rules", async () => {
    await admin.create(
      { name: "Samsung Brand", strategy: "BRAND", rate: 8, scope: { brandId: "samsung" }, priority: 4 },
      { admin: "admin-1" }
    );
    await admin.create(
      { name: "Platform Default", strategy: "GLOBAL", rate: 2, priority: 8 },
      { admin: "admin-1" }
    );

    const rules = admin.list({ limit: 20 }).items;
    const brandRule = rules.find((rule) => rule.strategy === "BRAND");
    assert.ok(brandRule);

    const simulator = new CommissionRuleSimulatorService({ ruleAdmin: admin });
    const result = simulator.simulate({
      price: 100000,
      brandId: "samsung",
      vendorId: "vendor-1",
      categoryId: "phones",
      productId: "product-1",
    });
    assert.equal(result.valid, true);
    assert.equal(result.winningRule.strategy, "BRAND");
  });
});

describe("CouponValidationService multi-vendor", () => {
  it("validates shop-specific coupons across marketplace cart segments", async () => {
    const legacy = {
      findCouponByName: async () => ({
        _id: "c1",
        name: "SHOP10",
        value: 10,
        discountType: "PERCENTAGE",
        shopId: "shop-a",
        isActive: true,
        usageCount: 0,
        usageLimit: 5,
        minAmount: 1000,
      }),
    };
    const validator = new CouponValidationService({ legacy });
    const result = await validator.validateForOrder({
      code: "SHOP10",
      cart: [
        { _id: "p1", shopId: "shop-a", discountPrice: 5000, qty: 1, category: "phones" },
        { _id: "p2", shopId: "shop-b", discountPrice: 8000, qty: 1, category: "electronics" },
      ],
    });
    assert.equal(result.valid, true);
    assert.equal(result.coupon.discountAmount, 500);
  });
});
