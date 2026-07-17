const express = require("express");
const dto = require("../../api/dto");
const validators = require("../../api/validators");
const { ValidationMiddleware } = require("../../api/middleware");

const ROUTE_VALIDATION_MAP = {
  "POST /api/v1/payments/checkout": {
    dtoFactory: dto.CheckoutRequest.from,
    validator: validators.CheckoutRequestValidator,
  },
  "POST /api/v1/payments/orders": {
    dtoFactory: dto.CreateOrderPaymentRequest.from,
    validator: validators.CreateOrderPaymentValidator,
  },
  "POST /api/v1/payments/orders/capture": {
    dtoFactory: dto.CapturePaymentRequest.from,
    validator: validators.CapturePaymentValidator,
  },
  "POST /api/v1/payments/wallets/credit": {
    dtoFactory: dto.WalletCreditRequest.from,
    validator: validators.WalletCreditValidator,
  },
  "POST /api/v1/payments/wallets/debit": {
    dtoFactory: dto.WalletDebitRequest.from,
    validator: validators.WalletDebitValidator,
  },
  "POST /api/v1/payments/escrow/hold": {
    dtoFactory: dto.EscrowRequest.from,
    validator: validators.EscrowRequestValidator,
  },
  "POST /api/v1/payments/escrow/release": {
    dtoFactory: dto.EscrowRequest.from,
    validator: validators.EscrowRequestValidator,
  },
  "POST /api/v1/payments/refunds/request": {
    dtoFactory: dto.RefundRequest.from,
    validator: validators.RefundRequestValidator,
  },
  "POST /api/v1/payments/refunds/approve": {
    dtoFactory: dto.RefundRequest.from,
    validator: validators.RefundRequestValidator,
  },
  "POST /api/v1/payments/settlements/settle": {
    dtoFactory: (body, headers) => dto.SettlementRequest.from({ ...body, action: "settle" }, headers),
    validator: validators.SettlementRequestValidator,
  },
  "POST /api/v1/payments/settlements/preview": {
    dtoFactory: (body, headers) => dto.SettlementRequest.from({ ...body, action: "preview" }, headers),
    validator: validators.SettlementRequestValidator,
  },
  "POST /api/v1/payments/subscriptions/create": {
    dtoFactory: dto.SubscriptionRequest.from,
    validator: validators.SubscriptionRequestValidator,
  },
  "POST /api/v1/payments/subscriptions/activate": {
    dtoFactory: dto.SubscriptionRequest.from,
    validator: validators.SubscriptionRequestValidator,
  },
  "POST /api/v1/payments/payouts/request": {
    dtoFactory: dto.VendorPayoutRequest.from,
    validator: validators.VendorPayoutRequestValidator,
  },
  "POST /api/v1/payments/payouts/approve": {
    dtoFactory: dto.VendorPayoutRequest.from,
    validator: validators.VendorPayoutRequestValidator,
  },
  "POST /api/v1/payments/delivery/prepare": {
    dtoFactory: (body, headers) => dto.DeliveryPaymentRequest.from({ ...body, action: "prepare" }, headers),
    validator: validators.DeliveryPaymentRequestValidator,
  },
  "POST /api/v1/payments/delivery/settle": {
    dtoFactory: (body, headers) => dto.DeliveryPaymentRequest.from({ ...body, action: "settle" }, headers),
    validator: validators.DeliveryPaymentRequestValidator,
  },
};

/**
 * Registers payment route adapters on Express.
 */
class RouteRegistration {
  static register(app, { apiLayer, middlewareStack, apiMiddleware, logger, webhookRouter, config }) {
    const router = express.Router();
    const errorHandler = apiMiddleware.ErrorMiddleware.handle();

    middlewareStack.forEach((mw) => router.use(mw));

    apiLayer.routeDefinitions.forEach((route) => {
      const routeKey = `${route.method} ${route.fullPath}`;
      const validation = ROUTE_VALIDATION_MAP[routeKey];
      const handlers = [];

      if (validation) {
        handlers.push(
          ValidationMiddleware.create({
            dtoFactory: validation.dtoFactory,
            validator: validation.validator,
          })
        );
      }

      handlers.push(route.handler);
      router[route.method.toLowerCase()](route.fullPath.replace(/^\/api\/v1\/payments/, "") || "/", ...handlers);
      logger?.debug("Payment route registered", { routeKey });
    });

    if (config.enableWebhooks && webhookRouter) {
      let webhookRouteCount = 0;
      webhookRouter.getDefinitions().forEach((route) => {
        router[route.method.toLowerCase()](
          route.fullPath.replace(/^\/api\/v1\/payments/, ""),
          route.handler
        );
        webhookRouteCount += 1;
      });
      logger?.info("Payment webhook routes registered", {
        count: webhookRouteCount,
        basePath: "/api/v1/payments/webhooks",
      });
    }

    router.use(errorHandler);
    app.use("/api/v1/payments", router);

    logger?.info("Payment routes registered", {
      count: apiLayer.routeDefinitions.length,
      basePath: "/api/v1/payments",
    });

    return router;
  }
}

module.exports = RouteRegistration;
