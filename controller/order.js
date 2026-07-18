const express = require("express");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const { getOrderPlatform } = require("../marketplace");
const OrderSecurity = require("../marketplace/orders/OrderSecurity");
const OrderValidation = require("../marketplace/orders/OrderValidation");
const {
  createOrderCreateLimiter,
  createOrderMutationLimiter,
} = require("../marketplace/orders/middleware/orderRateLimit");

const router = express.Router();

function handleServiceError(error, next) {
  return next(new ErrorHandler(error.message, error.statusCode || 500));
}

function resolveSellerId(req) {
  return req.seller?._id || req.seller?.id;
}

function resolveIdempotencyKey(req) {
  return req.headers["idempotency-key"] || req.headers["Idempotency-Key"] || null;
}

router.post(
  "/create-order",
  isAuthenticated,
  createOrderCreateLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const ownership = OrderSecurity.assertUserOwnership(req, req.body.user?._id);
      if (!ownership.valid) {
        return next(new ErrorHandler("You are not allowed to create this order", ownership.statusCode));
      }

      const platform = getOrderPlatform();
      const result = await platform.createOrders(req.body, {
        idempotencyKey: resolveIdempotencyKey(req),
      });

      res.status(201).json({
        success: true,
        orders: result.orders,
        paymentSessions: result.paymentSessions,
      });
    } catch (error) {
      return handleServiceError(error, next);
    }
  })
);

router.get(
  "/get-all-orders/:userId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const ownership = OrderSecurity.assertUserOwnership(req, req.params.userId);
      if (!ownership.valid) {
        return next(new ErrorHandler("You are not allowed to view these orders", ownership.statusCode));
      }

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
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (String(resolveSellerId(req)) !== String(req.params.shopId)) {
        return next(new ErrorHandler("You are not allowed to view these orders", 403));
      }

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
  createOrderMutationLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status } = OrderSecurity.pickStatusBody(req.body);
      if (!status) {
        return next(new ErrorHandler("Order status is required", 400));
      }

      const platform = getOrderPlatform();
      const order = await platform.updateStatus(
        req.params.id,
        status,
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
  isAuthenticated,
  createOrderMutationLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const platform = getOrderPlatform();
      const orderRecord = await platform.orderService.findById(req.params.id);
      const ownership = OrderSecurity.assertOrderOwnership(orderRecord, req.user._id);
      if (!ownership.valid) {
        return next(new ErrorHandler("You are not allowed to request a refund for this order", ownership.statusCode));
      }

      const refundCheck = OrderValidation.canRequestRefund(orderRecord);
      if (!refundCheck.allowed) {
        return next(new ErrorHandler("Refund is not allowed for this order status", 409));
      }

      const { status } = OrderSecurity.pickStatusBody(req.body);
      const order = await platform.requestRefund(
        req.params.id,
        status || "Processing refund",
        req.user._id
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
  createOrderMutationLimiter,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status } = OrderSecurity.pickStatusBody(req.body);
      if (!status) {
        return next(new ErrorHandler("Order status is required", 400));
      }

      const platform = getOrderPlatform();
      await platform.acceptRefund(req.params.id, status, resolveSellerId(req));

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
