const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const http = require("http");
const GrowthConfigurationPlatform = require("../GrowthConfigurationPlatform");
const GrowthConfigStore = require("../GrowthConfigStore");
const GrowthFeatureFlagService = require("../GrowthFeatureFlagService");
const { GrowthSettingsDefaults: defaultSettings } = require("../GrowthSettingsDefaults");
const GrowthAdminAccess = require("../GrowthAdminAccess");
const GrowthOperationGuard = require("../GrowthOperationGuard");
const GrowthAnalyticsService = require("../GrowthAnalyticsService");
const ReferralAttributionService = require("../ReferralAttributionService");
const CouponValidationService = require("../CouponValidationService");
const PromotionValidationService = require("../PromotionValidationService");
const GrowthLegacyAdapter = require("../GrowthLegacyAdapter");
const GrowthPlatform = require("../GrowthPlatform");
const { registerGrowthPlatform } = require("../index");
const { registerMarketplaceCore } = require("../../index");

function createTempDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "growth-config-test-"));
}

function cleanupDir(dir) {
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

describe("GrowthConfigurationPlatform", () => {
  let platform;

  beforeEach(() => {
    platform = new GrowthConfigurationPlatform({ storeOptions: { useMemoryOnly: true } });
  });

  it("loads default settings", async () => {
    await platform.initialize();
    const config = platform.getConfiguration();
    assert.equal(config.phase, "9.1");
    assert.deepEqual(config.settings.affiliate, defaultSettings.affiliate);
    assert.equal(config.commissionRules.length, 2);
  });

  it("updates configuration and records audit entries", async () => {
    await platform.initialize();
    const result = await platform.updateConfiguration(
      { settings: { referral: { enabled: false } } },
      { admin: "admin-1", reason: "Maintenance" }
    );

    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0].setting, "referral");
    assert.equal(result.changes[0].oldValue.enabled, true);
    assert.equal(result.changes[0].newValue.enabled, false);
    assert.equal(platform.getFeatureFlags().isReferralEnabled(), false);

    const audit = platform.getAuditHistory();
    assert.equal(audit.length, 1);
    assert.equal(audit[0].admin, "admin-1");
  });

  it("rejects invalid configuration updates", async () => {
    await platform.initialize();
    await assert.rejects(
      () => platform.updateConfiguration({ settings: { unknownFlag: true } }),
      (error) => error.statusCode === 400
    );
  });
});

describe("GrowthFeatureFlagService", () => {
  it("reads flags dynamically after store updates", async () => {
    const store = new GrowthConfigStore({ useMemoryOnly: true });
    await store.initialize();
    const flags = new GrowthFeatureFlagService(store);

    assert.equal(flags.isCouponEnabled(), true);
    assert.equal(flags.isAffiliateEnabled(), true);

    await store.updateSettings({ coupons: { enabled: false } }, { admin: "admin" });
    assert.equal(flags.isCouponEnabled(), false);
  });
});

describe("GrowthConfigStore persistence", () => {
  let dataDir;

  beforeEach(() => {
    dataDir = createTempDataDir();
  });

  afterEach(() => {
    cleanupDir(dataDir);
  });

  it("persists settings and audit log to disk", async () => {
    const store = new GrowthConfigStore({ dataDir });
    await store.initialize();
    await store.updateSettings({ promotions: { enabled: false } }, { admin: "admin-1" });

    const reloaded = new GrowthConfigStore({ dataDir });
    await reloaded.initialize();

    assert.equal(reloaded.getSettings().promotions.enabled, false);
    assert.equal(reloaded.getAuditLog().length, 1);
  });
});

describe("GrowthOperationGuard", () => {
  it("blocks referral when disabled", async () => {
    const store = new GrowthConfigStore({ useMemoryOnly: true });
    await store.initialize();
    const analytics = new GrowthAnalyticsService();
    const guard = new GrowthOperationGuard({
      featureFlags: new GrowthFeatureFlagService(store),
      analytics,
    });

    await store.updateSettings({ referral: { enabled: false } }, { admin: "admin" });
    assert.throws(() => guard.assertReferralEnabled(), (error) => error.reason === "FEATURE_DISABLED");
    assert.equal(analytics.getSummary().disabledFeatureAttempts, 1);
  });
});

describe("GrowthAdminAccess", () => {
  it("normalizes legacy Admin role for super admin endpoints", () => {
    const legacy = GrowthAdminAccess.assertSuperAdmin({ user: { _id: "1", role: "Admin" } });
    assert.equal(legacy.valid, true);

    const denied = GrowthAdminAccess.assertSuperAdmin({ user: { _id: "2", role: "user" } });
    assert.equal(denied.valid, false);
    assert.equal(denied.statusCode, 403);
  });
});

describe("ReferralAttributionService", () => {
  it("creates and verifies signed attribution tokens", () => {
    const service = new ReferralAttributionService({ secret: "test-secret" });
    const token = service.createAttributionToken({ referralCode: "1234ABCD1234", productId: "p1" });
    const verified = service.verifyAttributionToken(token);
    assert.equal(verified.valid, true);
    assert.equal(verified.payload.referralCode, "1234ABCD1234");
    assert.equal(service.resolveReferralFromTokens([token]), "1234ABCD1234");
  });

  it("rejects tampered tokens", () => {
    const service = new ReferralAttributionService({ secret: "test-secret" });
    const token = service.createAttributionToken({ referralCode: "1234ABCD1234" });
    const tampered = `${token}x`;
    assert.equal(service.verifyAttributionToken(tampered).valid, false);
  });
});

describe("CouponValidationService", () => {
  it("validates coupon eligibility server-side", async () => {
    const legacy = {
      findCouponByName: async () => ({
        _id: "c1",
        name: "SAVE10",
        value: 10,
        discountType: "PERCENTAGE",
        isActive: true,
        usageCount: 0,
        usageLimit: 5,
        minAmount: 1000,
      }),
    };
    const validator = new CouponValidationService({ legacy });
    const result = await validator.validate({ code: "SAVE10", cartTotal: 5000 });
    assert.equal(result.valid, true);
    assert.equal(result.coupon.discountAmount, 500);
  });

  it("rejects expired coupons", async () => {
    const legacy = {
      findCouponByName: async () => ({
        _id: "c2",
        name: "OLD",
        value: 5,
        isActive: true,
        expiresAt: new Date("2020-01-01"),
      }),
    };
    const validator = new CouponValidationService({ legacy });
    const result = await validator.validate({ code: "OLD", cartTotal: 5000 });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "COUPON_EXPIRED");
  });
});

describe("PromotionValidationService", () => {
  it("unifies coupon and product discount validation", async () => {
    const legacy = {
      findCouponByName: async () => null,
      findProductById: async () => ({
        _id: "p1",
        originalPrice: 10000,
        discountPrice: 8000,
      }),
    };
    const validator = new PromotionValidationService({ legacy });
    const coupon = await validator.validate({ type: "coupon", code: "MISSING", cartTotal: 1000 });
    assert.equal(coupon.valid, false);

    const discount = await validator.validate({ type: "product_discount", productId: "p1" });
    assert.equal(discount.valid, true);
    assert.equal(discount.promotion.type, "product_discount");
  });
});

describe("GrowthLegacyAdapter", () => {
  it("maps legacy sale statuses to reward ledger statuses", () => {
    const adapter = new GrowthLegacyAdapter();
    assert.equal(adapter.mapToRewardStatus("paid"), "approved");
    assert.equal(adapter.mapToRewardStatus("pending"), "pending");
    assert.equal(adapter.mapToRewardStatus("refunded"), "refunded");
  });
});

describe("GrowthPlatform orchestration", () => {
  it("resolves referral code from attribution tokens", async () => {
    const platform = new GrowthPlatform({
      configPlatform: new GrowthConfigurationPlatform({ storeOptions: { useMemoryOnly: true } }),
      attributionOptions: { secret: "test-secret" },
    });
    await platform.initialize();
    const token = platform.createAttributionToken({ referralCode: "5678EFGH5678" });
    const resolved = platform.resolveReferralCode({
      referralCode: "1111AAAA1111",
      attributionTokens: [token],
    });
    assert.equal(resolved, "5678EFGH5678");
  });
});

describe("Growth platform HTTP", () => {
  it("exposes public features and validates coupons", async () => {
    const app = express();
    app.use(express.json());
    registerMarketplaceCore(app, { growth: { useMemoryOnly: true } });

    const server = app.listen(0);
    const { port } = server.address();

    const features = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/growth/features`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    assert.equal(features.success, true);
    assert.equal(features.data.features.referral, true);

    const attribution = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/v2/marketplace/growth/referral/attribution",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => resolve(JSON.parse(data)));
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify({ referralCode: "1234ABCD1234", productId: "p1" }));
      req.end();
    });

    assert.equal(attribution.success, true);
    assert.ok(attribution.data.attributionToken);

    server.close();
  });

  it("blocks coupon validation when coupons are disabled", async () => {
    const app = express();
    app.use(express.json());
    const platform = registerGrowthPlatform(app, { useMemoryOnly: true });
    await platform.getConfigurationPlatform().initialize();
    await platform.getConfigurationPlatform().updateConfiguration(
      { settings: { coupons: { enabled: false } } },
      { admin: "admin" }
    );

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/v2/marketplace/growth/validate-coupon",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify({ code: "TEST" }));
      req.end();
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.reason, "FEATURE_DISABLED");
    server.close();
  });
});
