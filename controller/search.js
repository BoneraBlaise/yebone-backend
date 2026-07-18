const express = require("express");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { getSearchPlatform } = require("../marketplace");
const { searchQueryLimiter } = require("../marketplace/search/middleware/searchRateLimit");

const router = express.Router();

function handleServiceError(error, next) {
  return next(new ErrorHandler(error.message, error.statusCode || 500));
}

const SEARCH_QUERY_KEYS = new Set([
  "q",
  "search",
  "category",
  "tags",
  "shopId",
  "shop",
  "seller",
  "minPrice",
  "maxPrice",
  "priceMin",
  "priceMax",
  "minRating",
  "rating",
  "featured",
  "bestdeal",
  "discounted",
  "inStock",
  "productType",
  "condition",
  "location",
  "brand",
  "sort",
  "sortBy",
  "page",
  "limit",
]);

function hasSearchQuery(query = {}) {
  return Object.keys(query).some((key) => SEARCH_QUERY_KEYS.has(key));
}

router.get(
  "/products",
  searchQueryLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getSearchPlatform();
      const result = await platform.searchProducts(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/shops",
  searchQueryLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getSearchPlatform();
      const result = await platform.searchShops(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/categories",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getSearchPlatform();
      const result = await platform.listCategories();
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/suggestions",
  searchQueryLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getSearchPlatform();
      const result = await platform.suggest(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

module.exports = router;
module.exports.hasSearchQuery = hasSearchQuery;
