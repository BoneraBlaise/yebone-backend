const PaymentTransactionStatus = require("./PaymentTransactionStatus");
const PaymentTransactionStateMachine = require("./PaymentTransactionStateMachine");
const TransactionHelper = require("./TransactionHelper");
const TransactionConfig = require("./TransactionConfig");
const TransactionNotFoundError = require("./errors/TransactionNotFoundError");
const TransactionStatusConflictError = require("./errors/TransactionStatusConflictError");

const S = PaymentTransactionStatus;

/**
 * Payment transaction foundation service — persistence + lifecycle rules.
 * Not wired into PaymentModule in Module 2.
 */
class TransactionService {
  constructor({
    repository,
    stateMachine = new PaymentTransactionStateMachine(),
  } = {}) {
    if (!repository) {
      throw new Error("TransactionService requires a repository");
    }
    this.repository = repository;
    this.stateMachine = stateMachine;
  }

  async createTransaction(input = {}) {
    const amount = TransactionHelper.validateAmount(input.amount);
    const currency = TransactionHelper.normalizeCurrency(
      input.currency || TransactionConfig.defaultCurrency
    );

    const record = {
      transactionId: input.transactionId || TransactionHelper.generateTransactionId(),
      paymentReference: TransactionHelper.normalizeOptionalId(input.paymentReference),
      providerReference: TransactionHelper.normalizeOptionalId(input.providerReference),
      providerCode: TransactionHelper.normalizeOptionalId(input.providerCode),
      orderId: TransactionHelper.normalizeOptionalId(input.orderId),
      buyerId: TransactionHelper.normalizeOptionalId(input.buyerId),
      sellerId: TransactionHelper.normalizeOptionalId(input.sellerId),
      amount,
      currency,
      status: S.CREATED,
      metadata: input.metadata || {},
      capturedAt: null,
      settledAt: null,
      refundedAt: null,
    };

    return this.repository.create(record);
  }

  async getTransaction(transactionId) {
    const record = await this.repository.findByTransactionId(transactionId);
    if (!record) {
      throw new TransactionNotFoundError(transactionId);
    }
    return record;
  }

  async getByPaymentReference(paymentReference) {
    const record = await this.repository.findByPaymentReference(paymentReference);
    if (!record) {
      throw new TransactionNotFoundError(paymentReference);
    }
    return record;
  }

  async getByProviderReference(providerReference) {
    const record = await this.repository.findByProviderReference(providerReference);
    if (!record) {
      throw new TransactionNotFoundError(providerReference);
    }
    return record;
  }

  async getByOrderId(orderId) {
    const record = await this.repository.findByOrderId(orderId);
    if (!record) {
      throw new TransactionNotFoundError(orderId);
    }
    return record;
  }

  async listByBuyerId(buyerId, options = {}) {
    return this.repository.listByBuyerId(buyerId, options);
  }

  async listBySellerId(sellerId, options = {}) {
    return this.repository.listBySellerId(sellerId, options);
  }

  /**
   * Transition transaction to the next lifecycle state with validation.
   */
  async transitionStatus(transactionId, nextStatus, context = {}) {
    const current = await this.getTransaction(transactionId);

    if (current.status === nextStatus) {
      return current;
    }

    this.stateMachine.transition(current.status, nextStatus);

    const patch = this._buildTransitionPatch(nextStatus, context, current);
    const updated = await this.repository.transitionStatus(
      transactionId,
      current.status,
      nextStatus,
      patch
    );

    if (updated) {
      return updated;
    }

    const latest = await this.repository.findByTransactionId(transactionId);
    if (!latest) {
      throw new TransactionNotFoundError(transactionId);
    }

    if (latest.status === nextStatus) {
      return latest;
    }

    if (latest.status !== current.status) {
      throw new TransactionStatusConflictError(
        transactionId,
        current.status,
        latest.status
      );
    }

    throw new TransactionStatusConflictError(
      transactionId,
      current.status,
      latest.status
    );
  }

  _buildTransitionPatch(nextStatus, context, current) {
    const patch = {
      metadata: {
        ...(current.metadata || {}),
        ...(context.metadata || {}),
      },
    };

    if (context.providerReference) {
      patch.providerReference = TransactionHelper.normalizeOptionalId(
        context.providerReference
      );
    }

    if (context.providerCode) {
      patch.providerCode = TransactionHelper.normalizeOptionalId(context.providerCode);
    }

    if (context.paymentReference) {
      patch.paymentReference = TransactionHelper.normalizeOptionalId(
        context.paymentReference
      );
    }

    const now = new Date();

    if (nextStatus === S.CAPTURED && !current.capturedAt) {
      patch.capturedAt = now;
    }

    if (nextStatus === S.SETTLED && !current.settledAt) {
      patch.settledAt = now;
    }

    if (
      (nextStatus === S.REFUNDED || nextStatus === S.PARTIALLY_REFUNDED) &&
      !context.preserveRefundedAt
    ) {
      patch.refundedAt = now;
    }

    return patch;
  }

  getAllowedTransitions(transactionId) {
    return this.getTransaction(transactionId).then((record) =>
      this.stateMachine.getAllowedTransitions(record.status)
    );
  }
}

module.exports = TransactionService;
