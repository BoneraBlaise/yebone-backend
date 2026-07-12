const { Transaction } = require("../domain");
const { TransactionType, PaymentStatus } = require("../enums");
const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Immutable transaction ledger recording service.
 * Persists via TransactionRepository when storage layer is wired.
 */
class TransactionLedgerService {
  constructor({ transactionRepository }) {
    this.transactionRepository = transactionRepository;
  }

  _buildTransaction({ type, referenceId, amount, currency, status, providerCode, providerReference, description, metadata }) {
    return new Transaction({
      type,
      referenceId,
      amount,
      currency,
      status,
      providerCode,
      providerReference,
      description,
      metadata: { ...metadata, immutable: true, recordedAt: new Date().toISOString() },
    });
  }

  async recordOrderPayment(entry) {
    const transaction = this._buildTransaction({
      type: TransactionType.ORDER_PAYMENT,
      referenceId: entry.paymentId || entry.orderId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status || PaymentStatus.PENDING,
      providerCode: entry.providerCode || null,
      providerReference: entry.providerReference || null,
      description: `Order payment for order ${entry.orderId}`,
      metadata: entry.metadata || {},
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async recordSubscriptionPayment(entry) {
    const transaction = this._buildTransaction({
      type: TransactionType.SUBSCRIPTION,
      referenceId: entry.subscriptionPaymentId || entry.vendorId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status || PaymentStatus.PENDING,
      providerCode: entry.providerCode || null,
      providerReference: entry.providerReference || null,
      description: `Subscription payment for vendor ${entry.vendorId}`,
      metadata: entry.metadata || {},
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async recordPayout(entry) {
    const transaction = this._buildTransaction({
      type: TransactionType.PAYOUT,
      referenceId: entry.payoutId || entry.vendorId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status || PaymentStatus.PENDING,
      providerCode: entry.providerCode || null,
      providerReference: entry.providerReference || null,
      description: `Vendor payout for vendor ${entry.vendorId}`,
      metadata: entry.metadata || {},
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async recordRefund(entry) {
    const transaction = this._buildTransaction({
      type: TransactionType.REFUND,
      referenceId: entry.refundId || entry.paymentId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status || PaymentStatus.PENDING,
      providerCode: entry.providerCode || null,
      providerReference: entry.providerReference || null,
      description: `Refund for payment ${entry.paymentId}`,
      metadata: entry.metadata || {},
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async recordEscrow(entry) {
    const transaction = this._buildTransaction({
      type: TransactionType.ESCROW,
      referenceId: entry.escrowId || entry.orderId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status || PaymentStatus.PENDING,
      providerCode: entry.providerCode || null,
      providerReference: entry.providerReference || null,
      description: `Escrow movement for order ${entry.orderId}`,
      metadata: entry.metadata || {},
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }

  async recordWalletMovement(entry) {
    const transaction = this._buildTransaction({
      type: entry.movementType || TransactionType.PLATFORM_FEE,
      referenceId: entry.walletId || entry.ownerId,
      amount: entry.amount,
      currency: entry.currency,
      status: entry.status || PaymentStatus.PAID,
      description: entry.description || `Wallet movement for ${entry.ownerId}`,
      metadata: entry.metadata || {},
    });
    await this.transactionRepository.save(transaction);
    return transaction;
  }
}

module.exports = TransactionLedgerService;
