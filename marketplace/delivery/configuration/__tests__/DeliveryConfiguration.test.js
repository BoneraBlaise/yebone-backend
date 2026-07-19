const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const http = require("http");
const DeliveryConfigurationPlatform = require("../DeliveryConfigurationPlatform");
const DeliveryConfigStore = require("../DeliveryConfigStore");
const FeatureFlagService = require("../FeatureFlagService");
const DeliverySettingsDefaults = require("../DeliverySettingsDefaults");
const DeliveryAdminAccess = require("../DeliveryAdminAccess");
const DeliveryOperationGuard = require("../DeliveryOperationGuard");
const DeliveryConfigAnalytics = require("../DeliveryConfigAnalytics");
const {
  attachDeliveryConfigurationRoutes,
  registerDeliveryConfigurationPlatform,
} = require("../index");
const { registerMarketplaceCore } = require("../../../index");

function createTempDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "delivery-config-test-"));
}

function cleanupDir(dir) {
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

describe("DeliveryConfigurationPlatform", () => {
  let platform;

  beforeEach(() => {
    platform = new DeliveryConfigurationPlatform({ storeOptions: { useMemoryOnly: true } });
  });

  it("loads default settings", async () => {
    await platform.initialize();
    const config = platform.getConfiguration();
    assert.equal(config.phase, "8.3");
    assert.deepEqual(config.settings.vendorDelivery, DeliverySettingsDefaults.vendorDelivery);
    assert.equal(config.settings.yeboneDelivery.enabled, false);
  });

  it("updates configuration and records audit entries", async () => {
    await platform.initialize();
    const result = await platform.updateConfiguration(
      { yeboneDelivery: true },
      { admin: "admin-1", reason: "Enable pilot" }
    );

    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0].setting, "yeboneDelivery");
    assert.equal(result.changes[0].oldValue.enabled, false);
    assert.equal(result.changes[0].newValue.enabled, true);
    assert.equal(platform.getFeatureFlags().isYeboneDeliveryEnabled(), true);

    const audit = platform.getAuditHistory();
    assert.equal(audit.length, 1);
    assert.equal(audit[0].admin, "admin-1");
    assert.equal(audit[0].reason, "Enable pilot");
  });

  it("exposes checkout options with coming soon flag", async () => {
    await platform.initialize();
    const options = platform.getCheckoutOptions();
    assert.equal(options.vendorDelivery, true);
    assert.equal(options.customerPickup, true);
    assert.equal(options.yeboneDelivery, false);
    assert.equal(options.yeboneDeliveryComingSoon, true);
  });

  it("rejects invalid configuration updates", async () => {
    await platform.initialize();
    await assert.rejects(
      () => platform.updateConfiguration({ unknownFlag: true }),
      (error) => error.statusCode === 400
    );
  });
});

describe("FeatureFlagService", () => {
  it("reads flags dynamically after store updates", async () => {
    const store = new DeliveryConfigStore({ useMemoryOnly: true });
    await store.initialize();
    const flags = new FeatureFlagService(store);

    assert.equal(flags.isYeboneDeliveryEnabled(), false);
    assert.equal(flags.isManualAssignmentEnabled(), true);

    await store.updateSettings({ yeboneDelivery: { enabled: true } }, { admin: "admin" });
    assert.equal(flags.isYeboneDeliveryEnabled(), true);
  });
});

describe("DeliveryConfigStore persistence", () => {
  let dataDir;

  beforeEach(() => {
    dataDir = createTempDataDir();
  });

  afterEach(() => {
    cleanupDir(dataDir);
  });

  it("persists settings and audit log to disk", async () => {
    const store = new DeliveryConfigStore({ dataDir });
    await store.initialize();
    await store.updateSettings({ yeboneDelivery: { enabled: true } }, { admin: "admin-1" });

    const reloaded = new DeliveryConfigStore({ dataDir });
    await reloaded.initialize();

    assert.equal(reloaded.getSettings().yeboneDelivery.enabled, true);
    assert.equal(reloaded.getAuditLog().length, 1);
  });

  it("survives simulated server restart via new store instance", async () => {
    const storeA = new DeliveryConfigStore({ dataDir });
    await storeA.initialize();
    await storeA.updateSettings(
      { customerPickup: { enabled: false }, yeboneDelivery: { enabled: true } },
      { admin: "super-admin" }
    );

    const storeB = new DeliveryConfigStore({ dataDir });
    storeB.initializeSync();

    assert.equal(storeB.getSettings().customerPickup.enabled, false);
    assert.equal(storeB.getSettings().yeboneDelivery.enabled, true);
    assert.equal(storeB.getAuditLog().length, 2);
  });
});

describe("DeliveryOperationGuard", () => {
  it("blocks yebone delivery and manual assignment when disabled", async () => {
    const store = new DeliveryConfigStore({ useMemoryOnly: true });
    await store.initialize();
    const analytics = new DeliveryConfigAnalytics();
    const flags = new FeatureFlagService(store);
    const guard = new DeliveryOperationGuard({ featureFlags: flags, analytics });

    assert.throws(() => guard.assertYeboneDeliveryEnabled(), (error) => error.reason === "FEATURE_DISABLED");
    assert.doesNotThrow(() => guard.assertManualAssignmentEnabled());
    assert.equal(analytics.getSummary().rejectedDeliveryRequests, 1);

    await store.updateSettings({ manualAssignment: { enabled: false } }, { admin: "admin" });
    assert.throws(() => guard.assertManualAssignmentEnabled(), (error) => error.reason === "FEATURE_DISABLED");
    assert.equal(analytics.getSummary().rejectedCourierAssignments, 1);
  });

  it("allows operations when features are enabled", async () => {
    const store = new DeliveryConfigStore({ useMemoryOnly: true });
    await store.initialize();
    await store.updateSettings({ yeboneDelivery: { enabled: true } }, { admin: "admin" });
    const guard = new DeliveryOperationGuard({
      featureFlags: new FeatureFlagService(store),
      analytics: new DeliveryConfigAnalytics(),
    });

    assert.doesNotThrow(() => guard.assertYeboneDeliveryEnabled());
    assert.doesNotThrow(() => guard.assertManualAssignmentEnabled());
  });
});

describe("DeliveryAdminAccess", () => {
  it("normalizes legacy Admin role for super admin endpoints", () => {
    const legacy = DeliveryAdminAccess.assertSuperAdmin({ user: { _id: "1", role: "Admin" } });
    assert.equal(legacy.valid, true);
    assert.equal(legacy.role, "admin");

    const denied = DeliveryAdminAccess.assertSuperAdmin({ user: { _id: "2", role: "user" } });
    assert.equal(denied.valid, false);
    assert.equal(denied.statusCode, 403);
  });
});

describe("Delivery configuration HTTP", () => {
  it("exposes public features and checkout options", async () => {
    const app = express();
    registerMarketplaceCore(app, { deliveryConfiguration: { useMemoryOnly: true } });

    const server = app.listen(0);
    const { port } = server.address();

    const features = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/features`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    const checkout = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/checkout-options`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    server.close();

    assert.equal(features.success, true);
    assert.equal(features.data.features.yeboneDelivery, false);
    assert.equal(checkout.success, true);
    assert.equal(checkout.data.yeboneDeliveryComingSoon, true);
  });

  it("requires super admin for configuration endpoints", async () => {
    const app = express();
    app.use(express.json());
    const platform = registerDeliveryConfigurationPlatform(app, { useMemoryOnly: true });
    const router = express.Router();
    attachDeliveryConfigurationRoutes(router, platform, {
      authMiddleware: (req, _res, next) => next(),
    });
    app.use("/api/v2/marketplace/delivery", router);

    const server = app.listen(0);
    const { port } = server.address();

    const unauthorized = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/configuration`, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      }).on("error", reject);
    });

    server.close();
    assert.equal(unauthorized, 401);
  });

  it("allows super admin to read and update configuration", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { _id: "admin-1", role: "Admin" };
      next();
    });

    const platform = registerDeliveryConfigurationPlatform(app, { useMemoryOnly: true });
    const router = express.Router();
    attachDeliveryConfigurationRoutes(router, platform, {
      authMiddleware: (req, _res, next) => next(),
    });
    app.use("/api/v2/marketplace/delivery", router);

    const server = app.listen(0);
    const { port } = server.address();

    const getResponse = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/configuration`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    const putStatus = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        settings: { yeboneDelivery: true },
        reason: "Launch Yebone Delivery",
      });
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/v2/marketplace/delivery/configuration",
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        }
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });

    const auditResponse = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/delivery/configuration/audit`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    server.close();

    assert.equal(getResponse.success, true);
    assert.equal(putStatus, 200);
    assert.equal(auditResponse.success, true);
    assert.ok(auditResponse.data.some((entry) => entry.setting === "yeboneDelivery"));
    assert.equal(platform.getFeatureFlags().isYeboneDeliveryEnabled(), true);
  });
});
