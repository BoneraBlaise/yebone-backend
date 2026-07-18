const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  SearchQuery,
  SearchValidation,
  SearchTextNormalizer,
  SearchFilters,
  SearchRanking,
  SearchCompatibility,
  SearchPlatform,
} = require("../index");
const { MarketplaceCore } = require("../../index");

describe("Search production hardening (unit)", () => {
  it("normalizes unicode and deduplicates tokens", () => {
    const normalized = SearchTextNormalizer.normalizeKeyword("  Café   café  phone  ");
    assert.equal(normalized, "Café phone");
  });

  it("caps pagination and trims oversized queries", () => {
    const query = new SearchQuery({ config: { maxQueryLength: 10, maxLimit: 50, maxPage: 10 } });
    const normalized = query.normalize({
      q: "   verylongkeywordquery   verylongkeywordquery ",
      page: "999",
      limit: "500",
    });

    assert.equal(normalized.q.length <= 10, true);
    assert.equal(normalized.page, 10);
    assert.equal(normalized.limit, 50);
  });

  it("rejects invalid sort, rating, and product type", () => {
    const query = new SearchQuery();
    const invalidSort = query.normalize({ sort: "DROP TABLE" });
    assert.throws(
      () => SearchValidation.assertNormalizedQuery(invalidSort),
      (error) => error.code === "INVALID_SORT"
    );

    const invalidRating = query.normalize({ minRating: 9 });
    assert.throws(
      () => SearchValidation.assertNormalizedQuery(invalidRating),
      (error) => error.code === "INVALID_RATING"
    );

    const invalidType = query.normalize({ productType: "malicious-type" });
    assert.throws(
      () => SearchValidation.assertNormalizedQuery(invalidType),
      (error) => error.code === "INVALID_PRODUCT_TYPE"
    );
  });

  it("rejects forbidden operators and nested payloads", () => {
    assert.equal(SearchValidation.validateQuery({ $where: "1" }).valid, false);
    assert.equal(SearchValidation.validateQuery({ category: { $gt: 1 } }).valid, false);
  });

  it("builds stable metadata shape through SearchPlatform preparation", () => {
    const platform = new SearchPlatform({ marketplaceCore: new MarketplaceCore() });
    const normalized = platform._prepare({ q: "phone", page: 2, limit: 20, sort: "newest" });

    assert.equal(normalized.q, "phone");
    assert.equal(normalized.page, 2);
    assert.equal(normalized.limit, 20);
    assert.equal(normalized.sort, "newest");
  });

  it("detects legacy search query params centrally", () => {
    assert.equal(SearchCompatibility.hasSearchQuery({ category: "Electronics" }), true);
    assert.equal(SearchCompatibility.hasSearchQuery({ foo: "bar" }), false);
  });

  it("escapes regex metacharacters in keyword filters", () => {
    const filters = new SearchFilters();
    const built = filters.build({ q: "phone+(special)" });
    assert.match(built.filters.$or[0].name.$regex, /\\\+/);
  });

  it("supports safe ranking whitelist only", () => {
    const ranking = new SearchRanking();
    assert.equal(ranking.isSupported("newest"), true);
    assert.equal(ranking.isSupported("invalid-sort"), false);
  });
});

describe("Search production hardening (concurrent)", () => {
  it("handles concurrent platform preparation without shared mutation", async () => {
    const platform = new SearchPlatform({ marketplaceCore: new MarketplaceCore() });

    const results = await Promise.all([
      Promise.resolve().then(() => platform._prepare({ q: "phone", page: 1 })),
      Promise.resolve().then(() => platform._prepare({ q: "laptop", page: 2 })),
      Promise.resolve().then(() => platform._prepare({ q: "café", sort: "rating" })),
    ]);

    assert.equal(results[0].q, "phone");
    assert.equal(results[1].q, "laptop");
    assert.equal(results[2].sort, "rating");
  });
});
