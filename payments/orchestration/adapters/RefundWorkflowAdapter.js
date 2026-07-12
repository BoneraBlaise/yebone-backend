/**
 * Bridges refund coordination to existing workflow refund capabilities.
 * No provider execution — delegates to workflow placeholders only.
 */
class RefundWorkflowAdapter {
  constructor({ orderPaymentWorkflow, escrowWorkflow }) {
    this.orderPaymentWorkflow = orderPaymentWorkflow;
    this.escrowWorkflow = escrowWorkflow;
  }

  async requestRefund(params) {
    return this.orderPaymentWorkflow.refundOrderPayment(params);
  }

  async refundEscrow(params) {
    return this.escrowWorkflow.refundEscrow(params);
  }
}

module.exports = RefundWorkflowAdapter;
