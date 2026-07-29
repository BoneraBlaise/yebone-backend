const { getCreditCost, isPaidService } = require("./CreditPolicy");
const VendorAISubscriptionService = require("./VendorAISubscriptionService");
const VendorCreditsService = require("./VendorCreditsService");

class AIEntitlementsService {
  constructor() {
    this.subscriptions = new VendorAISubscriptionService();
    this.credits = new VendorCreditsService();
  }

  async assertEntitled(vendorId, { serviceType, previewType = null } = {}) {
    if (!vendorId) {
      return {
        ok: false,
        code: "VENDOR_REQUIRED",
        message: "A vendor account is required for this YEBO AI service.",
        displayBrand: "YEBO AI",
      };
    }

    const sub = await this.subscriptions.ensureSubscription(vendorId);
    if (!this.subscriptions.isActive(sub)) {
      return {
        ok: false,
        code: "SUBSCRIPTION_INACTIVE",
        message: "Your YEBO AI subscription is inactive. Please renew to continue.",
        displayBrand: "YEBO AI",
        subscription: this.subscriptions.toPublicDTO(sub),
      };
    }

    const creditCost = getCreditCost(serviceType, previewType);
    if (creditCost <= 0) {
      return {
        ok: true,
        creditCost: 0,
        subscription: this.subscriptions.toPublicDTO(sub),
        wallet: await this.credits.getWalletSnapshot(vendorId),
      };
    }

    const wallet = await this.credits.getWalletSnapshot(vendorId);
    if (wallet.remainingCredits < creditCost) {
      return {
        ok: false,
        code: "INSUFFICIENT_CREDITS",
        message: "Insufficient YEBO AI credits. Top up or upgrade your plan.",
        displayBrand: "YEBO AI",
        creditCost,
        wallet,
        subscription: this.subscriptions.toPublicDTO(sub),
      };
    }

    return {
      ok: true,
      creditCost,
      subscription: this.subscriptions.toPublicDTO(sub),
      wallet,
    };
  }

  requiresPayment(serviceType, previewType = null) {
    return isPaidService(serviceType, previewType);
  }

  async executeWithCredits(vendorId, {
    serviceType,
    previewType = null,
    idempotencyKey = null,
    requestId = null,
    metadata = {},
    executeFn,
  }) {
    const entitlement = await this.assertEntitled(vendorId, { serviceType, previewType });
    if (!entitlement.ok) return { ok: false, ...entitlement };

    if (entitlement.creditCost === 0) {
      try {
        const result = await executeFn();
        await this.subscriptions.recordUsage(vendorId, 1);
        return { ok: true, creditsConsumed: 0, result, subscription: entitlement.subscription };
      } catch (_err) {
        return {
          ok: false,
          code: "PROVIDER_FAILURE",
          message: "YEBO AI could not complete your request. Please try again.",
          displayBrand: "YEBO AI",
        };
      }
    }

    const debit = await this.credits.consumeCredits(vendorId, entitlement.creditCost, {
      idempotencyKey,
      requestId,
      serviceType: previewType || serviceType,
      metadata,
    });

    if (!debit.ok) {
      return { ok: false, ...debit, displayBrand: "YEBO AI" };
    }

    if (debit.duplicate && debit.cachedResponse) {
      return {
        ok: true,
        duplicate: true,
        creditsConsumed: debit.creditsConsumed,
        result: debit.cachedResponse,
        wallet: debit.wallet,
      };
    }

    try {
      const result = await executeFn();
      await this.subscriptions.recordUsage(vendorId, 1);
      if (idempotencyKey) {
        await this.credits.completeIdempotency(
          idempotencyKey,
          result,
          debit.creditsConsumed,
          debit.transactionId
        );
      }
      return {
        ok: true,
        creditsConsumed: debit.creditsConsumed,
        result,
        wallet: debit.wallet,
        transactionId: debit.transactionId,
        subscription: entitlement.subscription,
      };
    } catch (err) {
      if (debit.transactionId) {
        await this.credits.rollbackConsumption(debit.transactionId, {
          reason: err.message || "provider_failure",
        });
      }
      return {
        ok: false,
        code: "PROVIDER_FAILURE",
        message: "YEBO AI could not complete your request. Credits have been restored.",
        displayBrand: "YEBO AI",
      };
    }
  }
}

module.exports = AIEntitlementsService;
