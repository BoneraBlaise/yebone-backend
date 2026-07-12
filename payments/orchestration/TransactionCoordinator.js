const SagaCoordinator = require("./infrastructure/SagaCoordinator");
const RetryPolicy = require("./infrastructure/RetryPolicy");

/**
 * Coordinates complete marketplace financial transactions across orchestrators.
 */
class TransactionCoordinator {
  constructor({
    checkoutOrchestrator,
    orderTransactionOrchestrator,
    refundOrchestrator,
    escrowOrchestrator,
    settlementOrchestrator,
    walletOrchestrator,
    vendorSubscriptionOrchestrator,
    vendorPayoutOrchestrator,
    deliveryPaymentOrchestrator,
    auditService,
    retryPolicy,
  }) {
    this.checkoutOrchestrator = checkoutOrchestrator;
    this.orderTransactionOrchestrator = orderTransactionOrchestrator;
    this.refundOrchestrator = refundOrchestrator;
    this.escrowOrchestrator = escrowOrchestrator;
    this.settlementOrchestrator = settlementOrchestrator;
    this.walletOrchestrator = walletOrchestrator;
    this.vendorSubscriptionOrchestrator = vendorSubscriptionOrchestrator;
    this.vendorPayoutOrchestrator = vendorPayoutOrchestrator;
    this.deliveryPaymentOrchestrator = deliveryPaymentOrchestrator;
    this.auditService = auditService;
    this.retryPolicy = retryPolicy || new RetryPolicy();
  }

  async runCheckout(input) {
    return this.checkoutOrchestrator.checkout(input);
  }

  async runOrderLifecycle(input) {
    const saga = new SagaCoordinator()
      .registerStep({
        name: "create",
        execute: () => this.orderTransactionOrchestrator.createOrderTransaction(input.create),
        compensate: async () => ({ placeholder: "reverse_create" }),
      })
      .registerStep({
        name: "authorize",
        execute: () => this.orderTransactionOrchestrator.authorize(input.authorize),
        compensate: async () => ({ placeholder: "reverse_authorize" }),
      })
      .registerStep({
        name: "capture",
        execute: () => this.orderTransactionOrchestrator.capture(input.capture),
        compensate: async () => ({ placeholder: "reverse_capture" }),
      });

    const result = await saga.execute(input);
    this.auditService.recordPayment("order_lifecycle", input.capture?.orderId || "unknown", result);
    return result;
  }

  async runRefundLifecycle(input) {
    const saga = new SagaCoordinator()
      .registerStep({
        name: "request",
        execute: () => this.refundOrchestrator.request(input.request),
        compensate: async () => ({ placeholder: "reverse_refund_request" }),
      })
      .registerStep({
        name: "approve",
        execute: () => this.refundOrchestrator.approve(input.approve),
        compensate: async () => ({ placeholder: "reverse_refund_approve" }),
      })
      .registerStep({
        name: "complete",
        execute: () => this.refundOrchestrator.complete(input.complete),
        compensate: async () => ({ placeholder: "reverse_refund_complete" }),
      });

    const result = await saga.execute(input);
    this.auditService.recordRefund("refund_lifecycle", input.request?.paymentId || "unknown", result);
    return result;
  }

  async runPayoutLifecycle(input) {
    const saga = new SagaCoordinator()
      .registerStep({
        name: "request",
        execute: () => this.vendorPayoutOrchestrator.request(input.request),
        compensate: async () => ({ placeholder: "reverse_payout_request" }),
      })
      .registerStep({
        name: "approve",
        execute: () => this.vendorPayoutOrchestrator.approve(input.approve),
        compensate: async () => ({ placeholder: "reverse_payout_approve" }),
      })
      .registerStep({
        name: "execute",
        execute: () => this.vendorPayoutOrchestrator.execute(input.execute),
        compensate: async () => ({ placeholder: "reverse_payout_execute" }),
      });

    const result = await saga.execute(input);
    this.auditService.recordPayout("payout_lifecycle", input.request?.vendorId || "unknown", result);
    return result;
  }

  buildRetryPlan(error, attempt = 1) {
    return this.retryPolicy.buildRetryMetadata({ attempt, error });
  }
}

module.exports = TransactionCoordinator;
