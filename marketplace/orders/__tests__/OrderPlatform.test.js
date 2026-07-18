const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const {
  OrderPlatform,
  OrderValidation,
  OrderLifecycle,
  OrderStatus,
} = require("../index");
const OrderService = require("../../services/OrderService");

describe("Order Platform", () => {
  it("integrates with Marketplace Core order service", () => {
    const core = new MarketplaceCore();
    const platform = new OrderPlatform({ marketplaceCore: core });

    assert.equal(platform.orderService, core.services.order);
    assert.equal(platform.config.version, "1.0.0");
  });

  it("exposes orders health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/orders/health`, (res) => {
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
    assert.equal(response.data.marketplaceIntegrated, true);
    assert.equal(response.data.paymentHooksReady, true);
  });

  it("validates order create input", () => {
    const invalid = OrderValidation.validateCreateInput({ user: { _id: "u1" } });
    assert.equal(invalid.valid, false);

    const valid = OrderValidation.validateCreateInput({
      user: { _id: "u1" },
      shippingAddress: { city: "Kigali" },
      paymentInfo: { type: "CARD" },
      cart: [{ shopId: "s1", discountPrice: 10, qty: 1 }],
    });
    assert.equal(valid.valid, true);
  });

  it("resolves order lifecycle phases", () => {
    const lifecycle = new OrderLifecycle();
    assert.equal(lifecycle.resolvePhase("Processing"), "Processing");
    assert.equal(lifecycle.resolvePhase("Shipping"), "in_transit");
    assert.equal(lifecycle.resolvePhase("Delivered"), "Delivered");
    assert.equal(lifecycle.resolvePhase("Processing refund"), "refund");
  });

  it("asserts seller ownership on orders", () => {
    const valid = OrderValidation.assertSellerOwnership(
      { cart: [{ shopId: "shop-1" }] },
      "shop-1"
    );
    assert.equal(valid.valid, true);

    const invalid = OrderValidation.assertSellerOwnership(
      { cart: [{ shopId: "shop-1" }] },
      "shop-2"
    );
    assert.equal(invalid.valid, false);
  });

  it("returns fulfillment status options", () => {
    const status = new OrderStatus();
    const options = status.getFulfillmentOptions("Shipping");
    assert.ok(options.includes("Delivered"));
    assert.equal(options.includes("Processing"), false);
  });
});

describe("OrderService validation", () => {
  it("rejects create without required fields", async () => {
    const service = new OrderService();
    await assert.rejects(
      () => service.createOrders({ user: { _id: "u1" } }),
      (error) => error.statusCode === 400
    );
  });

  it("rejects invalid order id lookup", async () => {
    const service = new OrderService();
    await assert.rejects(
      () => service.findById("invalid-id"),
      (error) => error.statusCode === 400
    );
  });

  it("rejects empty cart order create", async () => {
    const service = new OrderService();
    await assert.rejects(
      () =>
        service.createOrders({
          user: { _id: "u1" },
          shippingAddress: { city: "Kigali" },
          paymentInfo: { type: "CARD" },
          cart: [],
        }),
      (error) => error.statusCode === 400
    );
  });
});
