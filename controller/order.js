const express = require("express");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const { getOrderPlatform } = require("../marketplace");

const router = express.Router();

function handleServiceError(error, next) {
  return next(new ErrorHandler(error.message, error.statusCode || 500));
}

function resolveSellerId(req) {
  return req.seller?._id || req.seller?.id;
}

router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const { orders } = await platform.createOrders(req.body);
      const paymentSessions = await platform.preparePaymentSessions(orders, req.body.user);

      res.status(201).json({
        success: true,
        orders,
        paymentSessions,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const orders = await platform.history.listForUser(req.params.userId);

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const orders = await platform.history.listForShop(req.params.shopId);

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const order = await platform.updateStatus(
        req.params.id,
        req.body.status,
        resolveSellerId(req)
      );

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.put(
  "/order-refund/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const order = await platform.requestRefund(
        req.params.id,
        req.body.status || "Processing refund"
      );

      res.status(200).json({
        success: true,
        order,
        message: "Order Refund Request successfully!",
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      await platform.acceptRefund(req.params.id, req.body.status, resolveSellerId(req));

      res.status(200).json({
        success: true,
        message: "Order Refund successfull!",
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const orders = await platform.history.listForAdmin();

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

module.exports = router;
