const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const { VendorPlatform, VendorPermissions, VendorLifecycle } = require("../index");
const ShopService = require("../../services/ShopService");

describe("Vendor Platform", () => {
  it("integrates with Marketplace Core shop service", () => {
    const core = new MarketplaceCore();
    const platform = new VendorPlatform({ marketplaceCore: core });

    assert.equal(platform.shopService, core.services.shop);
    assert.equal(platform.registry.isEnabled("registration"), true);
    assert.equal(platform.config.version, "1.0.0");
  });

  it("exposes vendor health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/vendor/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });

    server.close();
    assert.equal(response.success, true);
    assert.equal(response.data.healthy, true);
    assert.ok(response.data.enabledFeatures.includes("registration"));
    assert.equal(response.data.marketplaceIntegrated, true);
  });

  it("enforces seller ownership permissions", () => {
    const valid = VendorPermissions.assertSellerOwnership("shop-1", "shop-1");
    assert.equal(valid.valid, true);

    const invalid = VendorPermissions.assertSellerOwnership("shop-1", "shop-2");
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, "NOT_OWNER");
  });

  it("resolves vendor lifecycle states", () => {
    const lifecycle = new VendorLifecycle();
    assert.equal(lifecycle.resolveState({}), "pending_activation");
    assert.equal(lifecycle.resolveState({ _id: "1", isVerified: false }), "active");
    assert.equal(lifecycle.resolveState({ _id: "1", isVerified: true }), "verified");
  });

  it("evaluates withdraw permissions", () => {
    const config = { minWithdrawAmount: 50, requireVerificationForWithdraw: true };
    const blocked = VendorPermissions.canWithdraw(
      { _id: "1", isVerified: false, withdrawMethod: {}, availableBalance: 100 },
      config
    );
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "NOT_VERIFIED");

    const allowed = VendorPermissions.canWithdraw(
      { _id: "1", isVerified: true, withdrawMethod: { bank: "x" }, availableBalance: 100 },
      config
    );
    assert.equal(allowed.allowed, true);
  });
});

describe("ShopService validation", () => {
  it("rejects login without credentials", async () => {
    const service = new ShopService();
    await assert.rejects(() => service.login("", ""), (error) => error.statusCode === 400);
  });

  it("rejects invalid activation token", async () => {
    const service = new ShopService();
    await assert.rejects(
      () => service.activateFromToken("not-a-valid-token"),
      (error) => error.statusCode === 400
    );
  });
});
