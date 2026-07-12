const { PaymentMethod } = require("../../enums");
const { delegateToFacade } = require("./LegacyFacadeDelegate");

/**
 * Legacy v2 payment process adapter.
 * Maps POST /api/v2/payment/process and GET /api/v2/payment/stripeapikey
 * to MarketplacePaymentFacade while preserving v2 response contracts.
 *
 * @deprecated Internal adapter — use MarketplacePaymentFacade via v1 routes for new integrations.
 */
class V2PaymentProcessAdapter {
  static async processPayment(body = {}) {
    const amount = Number(body.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      const error = new Error("Valid payment amount is required");
      error.statusCode = 400;
      throw error;
    }

    const orderId = body.orderId || `legacy-v2-${Date.now()}`;
    const delegation = await delegateToFacade("orderPayment", {
      action: "create",
      orderId,
      userId: body.userId || "legacy-v2",
      amount,
      currency: body.currency || "USD",
      method: body.method || PaymentMethod.CARD,
      metadata: {
        company: "Guriraline",
        source: "legacy_v2_payment_process",
        ...(body.metadata || {}),
      },
    });

    return V2PaymentProcessAdapter._mapProcessResponse(delegation, amount, orderId);
  }

  static getStripeApiKey() {
    return {
      stripeApikey: process.env.STRIPE_API_KEY || "",
    };
  }

  static _mapProcessResponse(delegation, amount, orderId) {
    const payload = delegation.result?.result ?? delegation.result;
    const referenceId =
      payload?.ledgerEntry?.referenceId ||
      payload?.workflowResult?.paymentId ||
      orderId;

    const clientSecret =
      payload?.workflowResult?.clientSecret ||
      `pending_${referenceId}_${amount}`;

    return {
      success: true,
      client_secret: clientSecret,
    };
  }
}

module.exports = V2PaymentProcessAdapter;
