const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { getProductPlatform, getSearchPlatform } = require("../marketplace");
const { hasSearchQuery } = require("../marketplace/search/SearchCompatibility");

const router = express.Router();

function handleServiceError(error, next) {
  return next(new ErrorHandler(error.message, error.statusCode || 500));
}

router.post(
  "/create-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getProductPlatform();
      const product = await platform.createProduct(req.body);

      res.status(201).json({
        success: true,
        product,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getProductPlatform();
      const products = await platform.catalog.listByShop(req.params.id);

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getProductPlatform();
      await platform.deleteProduct(req.params.id, { sellerId: req.seller._id });

      res.status(200).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (hasSearchQuery(req.query)) {
        const searchPlatform = getSearchPlatform();
        const result = await searchPlatform.searchProducts(req.query);
        return res.status(200).json({
          success: true,
          products: result.products,
        });
      }

      const platform = getProductPlatform();
      const products = await platform.catalog.listAll();

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getProductPlatform();
      await platform.addReview(req.body, req.user._id);

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.put(
  "/like-product",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getProductPlatform();
      const result = await platform.toggleLike(req.body.productId, req.user._id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getProductPlatform();
      const products = await platform.catalog.listAdmin();

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

module.exports = router;
