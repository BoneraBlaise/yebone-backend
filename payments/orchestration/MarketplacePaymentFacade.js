/**
 * Single public entry point for marketplace payment orchestration.
 * Delegates to specialized orchestrators — no provider execution.
 */
class MarketplacePaymentFacade {
  constructor({
    checkoutOrchestrator,
    orderTransactionOrchestrator,
    refundOrchestrator,
    vendorPayoutOrchestrator,
    vendorSubscriptionOrchestrator,
    walletOrchestrator,
    escrowOrchestrator,
    settlementOrchestrator,
    deliveryPaymentOrchestrator,
    transactionCoordinator,
  }) {
    this.checkoutOrchestrator = checkoutOrchestrator;
    this.orderTransactionOrchestrator = orderTransactionOrchestrator;
    this.refundOrchestrator = refundOrchestrator;
    this.vendorPayoutOrchestrator = vendorPayoutOrchestrator;
    this.vendorSubscriptionOrchestrator = vendorSubscriptionOrchestrator;
    this.walletOrchestrator = walletOrchestrator;
    this.escrowOrchestrator = escrowOrchestrator;
    this.settlementOrchestrator = settlementOrchestrator;
    this.deliveryPaymentOrchestrator = deliveryPaymentOrchestrator;
    this.transactionCoordinator = transactionCoordinator;
  }

  checkout(input) {
    return this.checkoutOrchestrator.checkout(input);
  }

  orderPayment(input) {
    const action = input.action || "create";
    const actions = {
      create: () => this.orderTransactionOrchestrator.createOrderTransaction(input),
      authorize: () => this.orderTransactionOrchestrator.authorize(input),
      capture: () => this.orderTransactionOrchestrator.capture(input),
      cancel: () => this.orderTransactionOrchestrator.cancel(input),
      refund: () => this.orderTransactionOrchestrator.refund(input),
      lifecycle: () => this.transactionCoordinator.runOrderLifecycle(input),
    };
    return actions[action]?.() || this.orderTransactionOrchestrator.createOrderTransaction(input);
  }

  refund(input) {
    const action = input.action || "request";
    const actions = {
      request: () => this.refundOrchestrator.request(input),
      review: () => this.refundOrchestrator.review(input),
      approve: () => this.refundOrchestrator.approve(input),
      complete: () => this.refundOrchestrator.complete(input),
      lifecycle: () => this.transactionCoordinator.runRefundLifecycle(input),
    };
    return actions[action]?.() || this.refundOrchestrator.request(input);
  }

  vendorPayout(input) {
    const action = input.action || "request";
    const actions = {
      request: () => this.vendorPayoutOrchestrator.request(input),
      approve: () => this.vendorPayoutOrchestrator.approve(input),
      execute: () => this.vendorPayoutOrchestrator.execute(input),
      lifecycle: () => this.transactionCoordinator.runPayoutLifecycle(input),
    };
    return actions[action]?.() || this.vendorPayoutOrchestrator.request(input);
  }

  subscription(input) {
    const action = input.action || "create";
    const actions = {
      create: () => this.vendorSubscriptionOrchestrator.create(input),
      activate: () => this.vendorSubscriptionOrchestrator.activate(input),
      renew: () => this.vendorSubscriptionOrchestrator.renew(input),
      cancel: () => this.vendorSubscriptionOrchestrator.cancel(input),
    };
    return actions[action]?.() || this.vendorSubscriptionOrchestrator.create(input);
  }

  wallet(input) {
    const action = input.action || "credit";
    const actions = {
      credit: () => this.walletOrchestrator.credit(input),
      debit: () => this.walletOrchestrator.debit(input),
      reserve: () => this.walletOrchestrator.reserve(input),
      release: () => this.walletOrchestrator.release(input),
    };
    return actions[action]?.() || this.walletOrchestrator.credit(input);
  }

  escrow(input) {
    const action = input.action || "hold";
    const actions = {
      hold: () => this.escrowOrchestrator.hold(input),
      release: () => this.escrowOrchestrator.release(input),
      dispute: () => this.escrowOrchestrator.dispute(input),
      refund: () => this.escrowOrchestrator.refund(input),
    };
    return actions[action]?.() || this.escrowOrchestrator.hold(input);
  }

  settlement(input) {
    const action = input.action || "settle";
    if (action === "preview") {
      return this.settlementOrchestrator.preview(input);
    }
    return this.settlementOrchestrator.settle(input);
  }

  delivery(input) {
    const action = input.action || "prepare";
    const actions = {
      prepare: () => this.deliveryPaymentOrchestrator.prepare(input),
      settle: () => this.deliveryPaymentOrchestrator.settle(input),
    };
    return actions[action]?.() || this.deliveryPaymentOrchestrator.prepare(input);
  }
}

module.exports = MarketplacePaymentFacade;
