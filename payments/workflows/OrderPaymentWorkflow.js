const NotImplementedError = require("../errors/NotImplementedError");
const { OrderPayment } = require("../domain");
const { PaymentStatus } = require("../enums");
const {
  PaymentCreated,
  PaymentAuthorized,
  PaymentCaptured,
  PaymentCancelled,
  PaymentRefunded,
} = require("../events");

/**
 * Order payment workflow — provider-independent orchestration layer.
 */
class OrderPaymentWorkflow {
  constructor({ paymentService, paymentRepository, ledger }) {
    this.paymentService = paymentService;
    this.paymentRepository = paymentRepository;
    this.ledger = ledger;
  }

  async createOrderPayment({ orderId, userId, amount, currency, method, country, metadata = {} }) {
    const draft = new OrderPayment({
      orderId,
      userId,
      amount,
      currency,
      method,
      status: PaymentStatus.PENDING,
      metadata,
    });

    const events = [
      new PaymentCreated(orderId, { userId, amount, currency, method, status: PaymentStatus.PENDING }),
    ];

    throw new NotImplementedError("OrderPaymentWorkflow", "createOrderPayment");
  }

  async authorizeOrderPayment({ paymentId, orderId, method, country, providerCode, metadata = {} }) {
    const events = [
      new PaymentAuthorized(paymentId || orderId, { status: PaymentStatus.AUTHORIZED, metadata }),
    ];
    throw new NotImplementedError("OrderPaymentWorkflow", "authorizeOrderPayment");
  }

  async captureOrderPayment({ paymentId, orderId, method, country, providerCode, metadata = {} }) {
    const events = [
      new PaymentCaptured(paymentId || orderId, { status: PaymentStatus.PAID, metadata }),
    ];
    throw new NotImplementedError("OrderPaymentWorkflow", "captureOrderPayment");
  }

  async cancelOrderPayment({ paymentId, orderId, method, country, providerCode, reason, metadata = {} }) {
    const events = [
      new PaymentCancelled(paymentId || orderId, { status: PaymentStatus.CANCELLED, reason, metadata }),
    ];
    throw new NotImplementedError("OrderPaymentWorkflow", "cancelOrderPayment");
  }

  async refundOrderPayment({ paymentId, orderId, amount, reason, method, country, providerCode, metadata = {} }) {
    const events = [
      new PaymentRefunded(paymentId || orderId, { amount, reason, status: PaymentStatus.REFUNDED, metadata }),
    ];
    throw new NotImplementedError("OrderPaymentWorkflow", "refundOrderPayment");
  }
}

module.exports = OrderPaymentWorkflow;
