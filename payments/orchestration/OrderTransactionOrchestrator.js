const { PaymentStatus } = require("../enums");

/**
 * Coordinates order payment transactions — no direct provider calls.
 */
class OrderTransactionOrchestrator {
  constructor({
    orderPaymentWorkflow,
    settlementEngine,
    ledger,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.orderPaymentWorkflow = orderPaymentWorkflow;
    this.settlementEngine = settlementEngine;
    this.ledger = ledger;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  _lockKey(orderId) {
    return `order-transaction:${orderId}`;
  }

  async createOrderTransaction(input) {
    const key = input.idempotencyKey || `create-order:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        this.auditService.recordPayment("order_transaction_create", input.orderId, input);
        const workflowResult = await this.orderPaymentWorkflow.createOrderPayment(input);
        const ledgerEntry = await this.ledger.recordOrderPayment({
          orderId: input.orderId,
          paymentId: input.paymentId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.PENDING,
          metadata: input.metadata,
        });
        return { workflowResult, ledgerEntry, coordinated: true };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async authorize(input) {
    const key = input.idempotencyKey || `authorize-order:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        this.auditService.recordPayment("order_transaction_authorize", input.orderId, input);
        const workflowResult = await this.orderPaymentWorkflow.authorizeOrderPayment(input);
        return { workflowResult, coordinated: true };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async capture(input) {
    const key = input.idempotencyKey || `capture-order:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        this.auditService.recordPayment("order_transaction_capture", input.orderId, input);
        const workflowResult = await this.orderPaymentWorkflow.captureOrderPayment(input);
        const ledgerEntry = await this.ledger.recordOrderPayment({
          orderId: input.orderId,
          paymentId: input.paymentId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.PAID,
          metadata: input.metadata,
        });
        const settlement = input.settlement
          ? this.settlementEngine.settleOrder(input.settlement)
          : null;
        return { workflowResult, ledgerEntry, settlement, coordinated: true };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async cancel(input) {
    const key = input.idempotencyKey || `cancel-order:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        this.auditService.recordPayment("order_transaction_cancel", input.orderId, input);
        const workflowResult = await this.orderPaymentWorkflow.cancelOrderPayment(input);
        return { workflowResult, coordinated: true };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }

  async refund(input) {
    const key = input.idempotencyKey || `refund-order:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(this._lockKey(input.orderId));
      try {
        this.auditService.recordRefund("order_transaction_refund", input.orderId, input);
        const workflowResult = await this.orderPaymentWorkflow.refundOrderPayment(input);
        const ledgerEntry = await this.ledger.recordRefund({
          paymentId: input.paymentId,
          refundId: input.refundId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.REFUNDED,
          metadata: input.metadata,
        });
        return { workflowResult, ledgerEntry, coordinated: true };
      } finally {
        this.lockManager.releaseLock(this._lockKey(input.orderId), lock.token);
      }
    });
  }
}

module.exports = OrderTransactionOrchestrator;
