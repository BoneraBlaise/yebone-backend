const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../index");
const MarketplacePermissions = require("../core/MarketplacePermissions");
const PaymentIntegrationHook = require("../hooks/PaymentIntegrationHook");

describe("Marketplace Core", () => {
  it("registers enabled core features", () => {
    const core = new MarketplaceCore();
    assert.equal(core.config.name, "Yebone");
    assert.equal(core.features.isEnabled("orders"), true);
    assert.equal(core.features.isEnabled("search"), true);
    assert.equal(core.features.isEnabled("delivery"), true);
    assert.equal(core.features.isEnabled("ai"), true);
  });

  it("enforces buyer/seller separation", () => {
    const valid = MarketplacePermissions.assertBuyerSellerSeparation({
      buyerId: "buyer-1",
      sellerId: "seller-1",
    });
    assert.equal(valid.valid, true);

    const invalid = MarketplacePermissions.assertBuyerSellerSeparation({
      buyerId: "same",
      sellerId: "same",
    });
    assert.equal(invalid.valid, false);
  });

  it("exposes marketplace health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app, {
      integration: { useMemoryOnly: true, skipSearchIndexes: true },
      delivery: { useMemoryOnly: true },
      growth: { useMemoryOnly: true },
    });

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/health`, (res) => {
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
    assert.ok(response.data.enabledFeatures.includes("orders"));
  });

  it("payment hook returns empty sessions when disabled", async () => {
    const hook = new PaymentIntegrationHook({ enabled: false });
    const sessions = await hook.prepareForOrders([{ _id: "1", totalPrice: 100 }], { _id: "u1" });
    assert.deepEqual(sessions, []);
  });
});

describe("OrderService validation", () => {
  it("rejects missing shippingAddress", async () => {
    const core = new MarketplaceCore();
    await assert.rejects(
      () => core.services.order.createOrders({ user: { _id: "u1" }, paymentInfo: {} }),
      (error) => error.statusCode === 400
    );
  });
});
