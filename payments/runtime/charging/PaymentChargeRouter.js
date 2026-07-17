const TransactionCorrelationPolicy = require("../webhooks/TransactionCorrelationPolicy");
const TransactionLinkConfig = require("../linking/TransactionLinkConfig");
const PaymentTransactionStatus = require("../../infrastructure/transactions/PaymentTransactionStatus");

/**
 * Routes order payment charges between legacy PaymentService and Payment Foundation.
 * Default (policy disabled): always legacy — no behaviour change.
 */
class PaymentChargeRouter {
  constructor({
    paymentService,
    foundationBridge = null,
    routingPolicy,
    transactionService = null,
    transactionLinkService = null,
    logger = null,
  }) {
    if (!paymentService) {
      throw new Error("PaymentChargeRouter requires paymentService");
    }
    if (!routingPolicy) {
      throw new Error("PaymentChargeRouter requires routingPolicy");
    }

    this.paymentService = paymentService;
    this.foundationBridge = foundationBridge;
    this.routingPolicy = routingPolicy;
    this.transactionService = transactionService;
    this.transactionLinkService = transactionLinkService;
    this.logger = logger;
  }

  async createOrderPayment(input = {}, trace = {}) {
    const correlationChain = TransactionCorrelationPolicy.fromChargeRequest({ input, trace });
    const providerCode = PaymentChargeRouter._resolveProviderCode(input);
    const useLegacy = this.routingPolicy.shouldUseLegacyCharge(providerCode);

    if (useLegacy) {
      return this._createLegacyOrderPayment(input, correlationChain, providerCode);
    }

    return this._createFoundationOrderPayment(input, correlationChain, providerCode);
  }

  async _createLegacyOrderPayment(input, correlationChain, providerCode) {
    const result = await this.paymentService.createOrderPayment({
      orderId: input.orderId,
      userId: input.userId,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      country: input.country,
      metadata: {
        ...(input.metadata || {}),
        correlationId: correlationChain.correlationId,
      },
    });

    const link = await this._linkLegacyCharge({
      input,
      correlationChain,
      providerCode,
      orderPayment: result.orderPayment,
      providerResult: result.providerResult,
    });

    this.logger?.info("Routed legacy charge", {
      ...TransactionCorrelationPolicy.toLogContext(correlationChain),
      chargePath: TransactionLinkConfig.chargePath.LEGACY,
      providerCode,
      linkId: link?.linkId || null,
    });

    return Object.freeze({
      chargePath: TransactionLinkConfig.chargePath.LEGACY,
      correlationId: correlationChain.correlationId,
      correlationChain,
      link,
      ...result,
    });
  }

  async _createFoundationOrderPayment(input, correlationChain, providerCode) {
    if (!this.foundationBridge?.isWired?.()) {
      throw new Error("Foundation charge path requested but PaymentEngine is not wired");
    }

    const chargeResult = await this.foundationBridge.charge(
      {
        orderId: input.orderId,
        buyerId: input.userId,
        sellerId: input.sellerId || input.metadata?.sellerId,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        countryCode: input.country,
        providerCode,
        paymentReference: input.paymentReference,
        metadata: input.metadata,
      },
      {
        correlationId: correlationChain.correlationId,
        requestId: input.requestId,
        idempotencyKey: input.idempotencyKey,
      }
    );

    const link = await this._linkFoundationCharge({
      input,
      correlationChain,
      providerCode,
      chargeResult,
    });

    this.logger?.info("Routed foundation charge", {
      ...TransactionCorrelationPolicy.toLogContext(correlationChain),
      chargePath: TransactionLinkConfig.chargePath.FOUNDATION,
      providerCode,
      linkId: link?.linkId || null,
    });

    return Object.freeze({
      chargePath: TransactionLinkConfig.chargePath.FOUNDATION,
      correlationId: correlationChain.correlationId,
      correlationChain,
      link,
      chargeResult,
    });
  }

  async _linkLegacyCharge({ input, correlationChain, providerCode, orderPayment, providerResult }) {
    if (!this.transactionService || !this.transactionLinkService) {
      return null;
    }

    const providerReference =
      orderPayment.providerReference || providerResult?.providerReference || null;
    const legacyTransactionId =
      orderPayment.id ||
      orderPayment.paymentIntentId ||
      `legacy:${input.orderId}:${providerReference || "pending"}`;

    const existing = providerReference
      ? await this.transactionLinkService.findByProviderReference(providerReference)
      : null;
    if (existing) {
      return existing;
    }

    const module2Transaction = await this.transactionService.createTransaction({
      orderId: input.orderId,
      buyerId: input.userId,
      sellerId: input.sellerId || input.metadata?.sellerId,
      amount: input.amount,
      currency: input.currency,
      providerReference,
      providerCode,
      paymentReference: input.paymentReference || `pay-${input.orderId}`,
      metadata: {
        ...(input.metadata || {}),
        correlationId: correlationChain.correlationId,
        legacyTransactionId,
        chargePath: TransactionLinkConfig.chargePath.LEGACY,
      },
    });

    await this._syncProviderStatus(module2Transaction.transactionId, providerResult?.status);

    return this.transactionLinkService.link({
      legacyTransactionId,
      module2TransactionId: module2Transaction.transactionId,
      providerReference,
      paymentReference: module2Transaction.paymentReference,
      orderId: input.orderId,
      sellerId: input.sellerId || input.metadata?.sellerId,
      buyerId: input.userId,
      providerCode,
      correlationId: correlationChain.correlationId,
      chargePath: TransactionLinkConfig.chargePath.LEGACY,
    });
  }

  async _linkFoundationCharge({ input, correlationChain, providerCode, chargeResult }) {
    if (!this.transactionLinkService || !chargeResult?.transactionId) {
      return null;
    }

    const providerReference =
      chargeResult.providerReference || chargeResult.paymentReference || input.paymentReference || null;

    return this.transactionLinkService.link({
      legacyTransactionId: null,
      module2TransactionId: chargeResult.transactionId,
      providerReference,
      paymentReference: chargeResult.paymentReference,
      orderId: input.orderId,
      sellerId: input.sellerId || input.metadata?.sellerId,
      buyerId: input.userId,
      providerCode: chargeResult.providerCode || providerCode,
      correlationId: correlationChain.correlationId,
      chargePath: TransactionLinkConfig.chargePath.FOUNDATION,
    });
  }

  async _syncProviderStatus(transactionId, providerStatus) {
    if (!this.transactionService || !providerStatus) {
      return;
    }

    const targetStatus = PaymentChargeRouter._mapProviderStatus(providerStatus);
    if (!targetStatus || targetStatus === PaymentTransactionStatus.CREATED) {
      return;
    }

    await this.transactionService.transitionStatus(transactionId, targetStatus);
  }

  static _mapProviderStatus(providerStatus) {
    const normalized = String(providerStatus || "")
      .trim()
      .toUpperCase();

    if (normalized === "PENDING" || normalized === "PROCESSING") {
      return PaymentTransactionStatus.PENDING;
    }
    if (normalized === "AUTHORIZED") {
      return PaymentTransactionStatus.AUTHORIZED;
    }
    if (
      normalized === "COMPLETED" ||
      normalized === "SUCCESS" ||
      normalized === "SUCCESSFUL" ||
      normalized === "CAPTURED"
    ) {
      return PaymentTransactionStatus.CAPTURED;
    }
    if (normalized === "FAILED" || normalized === "FAILURE") {
      return PaymentTransactionStatus.FAILED;
    }
    if (normalized === "CANCELLED" || normalized === "CANCELED") {
      return PaymentTransactionStatus.CANCELLED;
    }

    return null;
  }

  static _resolveProviderCode(input = {}) {
    return String(
      input.providerCode || input.metadata?.providerCode || input.method || "UNKNOWN"
    )
      .trim()
      .toUpperCase();
  }
}

module.exports = PaymentChargeRouter;
