const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { MarketplaceCore, registerMarketplaceCore } = require("../../index");
const {
  SearchPlatform,
  SearchQuery,
  SearchValidation,
  SearchFilters,
  SearchRanking,
} = require("../index");

describe("Search Platform", () => {
  it("integrates with Marketplace Core services", () => {
    const core = new MarketplaceCore();
    const platform = new SearchPlatform({ marketplaceCore: core });

    assert.equal(platform.searchService.productService, core.services.product);
    assert.equal(platform.config.version, "1.0.0");
  });

  it("exposes search health endpoint", async () => {
    const app = express();
    registerMarketplaceCore(app);

    const server = app.listen(0);
    const { port } = server.address();

    const response = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/v2/marketplace/search/health`, (res) => {
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
    assert.equal(response.data.productSearchReady, true);
  });

  it("normalizes and trims search queries", () => {
    const query = new SearchQuery({ config: { maxQueryLength: 20 } });
    const normalized = query.normalize({ q: "  laptop  ", page: "2", limit: "500" });

    assert.equal(normalized.q, "laptop");
    assert.equal(normalized.page, 2);
    assert.equal(normalized.limit, 100);
  });

  it("rejects forbidden NoSQL operators", () => {
    const invalid = SearchValidation.validateQuery({ $where: "true" });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, "FORBIDDEN_OPERATOR");
  });

  it("builds keyword and price filters from ProductSearch base", () => {
    const filters = new SearchFilters();
    const built = filters.build({
      q: "phone",
      category: "Electronics",
      minPrice: 1000,
      maxPrice: 50000,
      filters: { inStock: true, featured: true },
    });

    assert.equal(built.filters.category, "Electronics");
    assert.ok(built.filters.$or);
    assert.equal(built.filters.discountPrice.$gte, 1000);
    assert.equal(built.filters.stock.$gt, 0);
    assert.equal(built.filters.featured, true);
  });

  it("supports ranking options used by the frontend", () => {
    const ranking = new SearchRanking();
    assert.deepEqual(ranking.buildSort("priceLowToHigh"), { discountPrice: 1, createdAt: -1 });
    assert.deepEqual(ranking.buildSort("newest"), { createdAt: -1 });
    assert.equal(ranking.isSupported("bestSelling"), true);
  });
});
