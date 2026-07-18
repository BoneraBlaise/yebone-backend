const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const SearchPlatform = require("./SearchPlatform");
const { searchQueryLimiter } = require("./middleware/searchRateLimit");

let searchPlatformInstance = null;

function createSearchPlatform(marketplaceCore, options = {}) {
  searchPlatformInstance = new SearchPlatform({
    marketplaceCore,
    config: options.config,
  });
  return searchPlatformInstance;
}

function getSearchPlatform() {
  if (!searchPlatformInstance) {
    throw new Error("Search platform not initialized — call registerSearchPlatform first");
  }
  return searchPlatformInstance;
}

function registerSearchPlatform(app, marketplaceCore, options = {}) {
  const platform = createSearchPlatform(marketplaceCore, options);
  app.locals.searchPlatform = platform;

  const router = express.Router();

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health.check() });
    })
  );

  router.get(
    "/products",
    searchQueryLimiter,
    catchAsyncErrors(async (req, res) => {
      const result = await platform.searchProducts(req.query);
      res.status(200).json({ success: true, ...result });
    })
  );

  router.get(
    "/shops",
    searchQueryLimiter,
    catchAsyncErrors(async (req, res) => {
      const result = await platform.searchShops(req.query);
      res.status(200).json({ success: true, ...result });
    })
  );

  router.get(
    "/categories",
    catchAsyncErrors(async (_req, res) => {
      const result = await platform.listCategories();
      res.status(200).json({ success: true, ...result });
    })
  );

  router.get(
    "/suggestions",
    searchQueryLimiter,
    catchAsyncErrors(async (req, res) => {
      const result = await platform.suggest(req.query);
      res.status(200).json({ success: true, ...result });
    })
  );

  app.use("/api/v2/marketplace/search", router);
  return platform;
}

module.exports = {
  SearchPlatform,
  SearchConfiguration: require("./SearchConfiguration"),
  SearchQuery: require("./SearchQuery"),
  SearchValidation: require("./SearchValidation"),
  SearchFilters: require("./SearchFilters"),
  SearchRanking: require("./SearchRanking"),
  SearchSuggestions: require("./SearchSuggestions"),
  SearchAnalytics: require("./SearchAnalytics"),
  SearchHealth: require("./SearchHealth"),
  SearchHooks: require("./SearchHooks"),
  SearchTextNormalizer: require("./SearchTextNormalizer"),
  SearchCompatibility: require("./SearchCompatibility"),
  createSearchPlatform,
  getSearchPlatform,
  registerSearchPlatform,
};
