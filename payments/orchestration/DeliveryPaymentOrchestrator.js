/**
 * Coordinates delivery payment workflow, pricing service, and settlement engine.
 */
class DeliveryPaymentOrchestrator {
  constructor({
    deliveryPaymentWorkflow,
    deliveryPricingService,
    settlementEngine,
    auditService,
    idempotencyService,
  }) {
    this.deliveryPaymentWorkflow = deliveryPaymentWorkflow;
    this.deliveryPricingService = deliveryPricingService;
    this.settlementEngine = settlementEngine;
    this.auditService = auditService;
    this.idempotencyService = idempotencyService;
  }

  async prepare(input) {
    const key = input.idempotencyKey || `delivery-prepare:${input.orderId || "draft"}`;
    return this.idempotencyService.execute(key, input, async () => {
      const workflowResult = this.deliveryPaymentWorkflow.prepareDeliveryPayment(input);
      const pricing = this.deliveryPricingService.calculate(input);
      this.auditService.recordSettlement("delivery_prepare", input.orderId || "draft", {
        workflowResult,
        pricing,
      });
      return { coordinated: true, workflowResult, pricing };
    });
  }

  async settle(input) {
    const key = input.idempotencyKey || `delivery-settle:${input.orderId}`;
    return this.idempotencyService.execute(key, input, async () => {
      this.auditService.recordSettlement("delivery_settle", input.orderId, input);
      const workflowResult = await this.deliveryPaymentWorkflow.settleDeliveryPayment(input);
      const settlement = input.orderSubtotal
        ? this.settlementEngine.settleOrder({
            orderId: input.orderId,
            orderSubtotal: input.orderSubtotal,
            deliveryFee: input.breakdown?.deliveryFee ?? input.deliveryFee ?? 0,
            vendorId: input.vendorId,
            commissionInput: input.commissionInput,
            deliveryInput: input.deliveryInput,
            vendorBalanceInput: input.vendorBalanceInput,
          })
        : null;
      return { coordinated: true, workflowResult, settlement };
    });
  }
}

module.exports = DeliveryPaymentOrchestrator;
