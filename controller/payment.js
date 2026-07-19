/**
 * @deprecated Legacy v2 payment routes — migrated to MarketplacePaymentFacade.
 * Routes preserved for backwards compatibility. Prefer /api/v1/payments for new integrations.
 *
 * Controller → MarketplacePaymentFacade → Orchestrators → Financial Core → Workflows
 */
const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAuthenticated } = require("../middleware/auth");
const { adapters } = require("../payments/legacy");

const V2PaymentProcessAdapter = adapters.V2PaymentProcessAdapter;

router.post(
  "/process",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const result = await V2PaymentProcessAdapter.processPayment(req.body);
      res.status(200).json(result);
    } catch (error) {
      return next(new ErrorHandler(error.message, error.statusCode || 500));
    }
  })
);

router.get(
  "/stripeapikey",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json(V2PaymentProcessAdapter.getStripeApiKey());
  })
);

module.exports = router;
