const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const {
  ProductPlatform,
  ProductValidation,
  ProductLifecycle,
  ProductSearch,
  ProductCatalogConfig,
} = require("../index");
const ProductService = require("../../services/ProductService");

describe("Product Platform", () => {
  it("integrates with Marketplace Core product service", () => {
    const core = new MarketplaceCore();
    const platform = new ProductPlatform({ marketplaceCore: core });

    assert.equal(platform.productService, core.services.product);
    assert.equal(platform.config.version, "1.0.0");
    assert.equal(platform.productService.shopService, core.services.shop);
  });

  it("exposes catalog health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/catalog/health`, (res) => {
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
    assert.equal(response.data.productServiceReady, true);
  });

  it("validates product create input", () => {
    const invalid = ProductValidation.validateCreateInput({ name: "Test" });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.fields.includes("shopId"));

    const valid = ProductValidation.validateCreateInput({
      name: "Test",
      description: "Desc",
      category: "Electronics",
      discountPrice: 100,
      stock: 5,
      shopId: "shop-1",
    });
    assert.equal(valid.valid, true);
  });

  it("resolves product lifecycle states", () => {
    const lifecycle = new ProductLifecycle();
    assert.equal(lifecycle.resolveState({ stock: 0 }), "out_of_stock");
    assert.equal(lifecycle.resolveState({ stock: 3, featured: true }), "featured");
    assert.equal(lifecycle.resolveState({ stock: 3 }), "active");
  });

  it("prepares search filters without executing search", () => {
    const search = new ProductSearch({ config: new ProductCatalogConfig() });
    const prepared = search.prepareFilters({
      category: "Phones",
      featured: "true",
      shopId: "abc",
    });

    assert.equal(prepared.enabled, true);
    assert.equal(prepared.filters.category, "Phones");
    assert.equal(prepared.filters.featured, true);
    assert.equal(prepared.filters.shopId, "abc");
  });

  it("asserts seller ownership", () => {
    const valid = ProductValidation.assertSellerOwnership({ shopId: "s1" }, "s1");
    assert.equal(valid.valid, true);

    const invalid = ProductValidation.assertSellerOwnership({ shopId: "s1" }, "s2");
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, "NOT_OWNER");
  });
});

describe("ProductService validation", () => {
  it("rejects delete with invalid id", async () => {
    const service = new ProductService();
    await assert.rejects(
      () => service.deleteProduct("invalid-id"),
      (error) => error.statusCode === 400
    );
  });

  it("rejects like toggle without product id", async () => {
    const service = new ProductService();
    await assert.rejects(
      () => service.toggleLike(null, "user-1"),
      (error) => error.statusCode === 400
    );
  });

  it("rejects update with invalid id", async () => {
    const service = new ProductService();
    await assert.rejects(
      () => service.updateProduct("bad-id", { name: "Updated" }),
      (error) => error.statusCode === 400
    );
  });
});
