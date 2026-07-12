const { PaymentStatus } = require("../enums");

/**
 * Coordinates vendor subscription workflow, financial engines, ledger, and audit.
 */
class VendorSubscriptionOrchestrator {
  constructor({
    vendorSubscriptionWorkflow,
    commissionEngine,
    vendorBalanceEngine,
    ledger,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.vendorSubscriptionWorkflow = vendorSubscriptionWorkflow;
    this.commissionEngine = commissionEngine;
    this.vendorBalanceEngine = vendorBalanceEngine;
    this.ledger = ledger;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  async create(input) {
    const key = input.idempotencyKey || `subscription-create:${input.vendorId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`subscription:${input.vendorId}`);
      try {
        this.auditService.recordSubscription("subscription_create", input.vendorId, input);
        const workflowResult = await this.vendorSubscriptionWorkflow.createSubscriptionPayment(input);
        const ledgerEntry = await this.ledger.recordSubscriptionPayment({
          vendorId: input.vendorId,
          subscriptionPaymentId: input.subscriptionPaymentId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.PENDING,
          metadata: input.metadata,
        });
        return { coordinated: true, workflowResult, ledgerEntry };
      } finally {
        this.lockManager.releaseLock(`subscription:${input.vendorId}`, lock.token);
      }
    });
  }

  async activate(input) {
    const key = input.idempotencyKey || `subscription-activate:${input.vendorId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`subscription:${input.vendorId}`);
      try {
        this.auditService.recordSubscription("subscription_activate", input.vendorId, input);
        const workflowResult = await this.vendorSubscriptionWorkflow.activateSubscription(input);
        const commission = this.commissionEngine.calculate({
          orderSubtotal: input.amount || 0,
          subscriptionDiscount: 1,
          ...input.commissionInput,
        });
        const vendorBalance = this.vendorBalanceEngine.calculateEarningsBreakdown({
          availableEarnings: input.amount || 0,
          ...input.vendorBalanceInput,
        });
        return { coordinated: true, workflowResult, commission, vendorBalance };
      } finally {
        this.lockManager.releaseLock(`subscription:${input.vendorId}`, lock.token);
      }
    });
  }

  async renew(input) {
    const key = input.idempotencyKey || `subscription-renew:${input.vendorId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`subscription:${input.vendorId}`);
      try {
        this.auditService.recordSubscription("subscription_renew", input.vendorId, input);
        const workflowResult = await this.vendorSubscriptionWorkflow.renewSubscription(input);
        const ledgerEntry = await this.ledger.recordSubscriptionPayment({
          vendorId: input.vendorId,
          subscriptionPaymentId: input.subscriptionPaymentId,
          amount: input.amount,
          currency: input.currency,
          status: PaymentStatus.PENDING,
          metadata: input.metadata,
        });
        return { coordinated: true, workflowResult, ledgerEntry };
      } finally {
        this.lockManager.releaseLock(`subscription:${input.vendorId}`, lock.token);
      }
    });
  }

  async cancel(input) {
    const key = input.idempotencyKey || `subscription-cancel:${input.vendorId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`subscription:${input.vendorId}`);
      try {
        this.auditService.recordSubscription("subscription_cancel", input.vendorId, input);
        const workflowResult = await this.vendorSubscriptionWorkflow.cancelSubscription(input);
        return { coordinated: true, workflowResult };
      } finally {
        this.lockManager.releaseLock(`subscription:${input.vendorId}`, lock.token);
      }
    });
  }
}

module.exports = VendorSubscriptionOrchestrator;
