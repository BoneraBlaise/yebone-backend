/**
 * Coordinates checkout across payment, escrow, settlement, and delivery flows.
 */
class CheckoutOrchestrator {
  constructor({
    orderTransactionOrchestrator,
    escrowOrchestrator,
    settlementOrchestrator,
    deliveryPaymentOrchestrator,
    auditService,
    idempotencyService,
    lockManager,
  }) {
    this.orderTransactionOrchestrator = orderTransactionOrchestrator;
    this.escrowOrchestrator = escrowOrchestrator;
    this.settlementOrchestrator = settlementOrchestrator;
    this.deliveryPaymentOrchestrator = deliveryPaymentOrchestrator;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
    this.lockManager = lockManager;
  }

  async checkout(input) {
    const key = input.idempotencyKey || `checkout:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      const lock = this.lockManager.acquireLock(`checkout:${input.orderId}`);
      const saga = new SagaCoordinator();

      try {
        this.auditService.recordPayment("checkout_started", input.orderId, input);

        const delivery = await this.deliveryPaymentOrchestrator.prepare(input.delivery || {});
        const created = await this.orderTransactionOrchestrator.createOrderTransaction({
          ...input.payment,
          orderId: input.orderId,
          idempotencyKey: `${key}:create`,
        });

        const authorized = await this.orderTransactionOrchestrator.authorize({
          ...input.payment,
          orderId: input.orderId,
          idempotencyKey: `${key}:authorize`,
        });

        const settlement = await this.settlementOrchestrator.settle({
          orderId: input.orderId,
          orderSubtotal: input.orderSubtotal,
          deliveryFee:
            delivery.result?.workflowResult?.breakdown?.deliveryFee ??
            delivery.result?.pricing?.deliveryFee ??
            input.deliveryFee ??
            0,
          vendorId: input.vendorId,
          commissionInput: input.commissionInput,
          deliveryInput: input.deliveryInput,
          vendorBalanceInput: input.vendorBalanceInput,
        });

        const escrow = await this.escrowOrchestrator.hold({
          orderId: input.orderId,
          amount: input.orderSubtotal,
          currency: input.payment?.currency,
          buyerId: input.buyerId,
          vendorId: input.vendorId,
          metadata: input.metadata,
          idempotencyKey: `${key}:escrow-hold`,
        });

        this.auditService.recordPayment("checkout_completed", input.orderId, {
          delivery,
          created,
          authorized,
          settlement,
          escrow,
        });

        return {
          coordinated: true,
          orderId: input.orderId,
          delivery,
          payment: { created, authorized },
          settlement,
          escrow,
        };
      } finally {
        this.lockManager.releaseLock(`checkout:${input.orderId}`, lock.token);
      }
    });
  }
}

module.exports = CheckoutOrchestrator;
