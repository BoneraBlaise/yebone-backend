const crypto = require("crypto");
const { PaymentStatus } = require("../enums");
const {
  PaymentCreated,
  PaymentAuthorized,
  PaymentCaptured,
  PaymentCancelled,
  PaymentRefunded,
} = require("../events");

class OrderPaymentWorkflow {
  constructor({ paymentService, paymentRepository, ledger }) {
    this.paymentService = paymentService;
    this.paymentRepository = paymentRepository;
    this.ledger = ledger;
  }

  _secret(orderId, amount) {
    return `pi_${orderId}_${amount}_${crypto.randomBytes(8).toString("hex")}`;
  }

  async createOrderPayment({ orderId, userId, amount, currency, method, country, metadata = {} }) {
    const paymentId = `pay_${orderId}`;
    const saved = await this.paymentRepository.saveOrderPayment({
      paymentId,
      orderId,
      userId,
      amount,
      currency: currency || "RWF",
      method: method || "CARD",
      status: PaymentStatus.PENDING,
      clientSecret: this._secret(orderId, amount),
      metadata: { country, ...metadata },
    });

    const events = [
      new PaymentCreated(orderId, {
        userId,
        amount,
        currency,
        method,
        status: PaymentStatus.PENDING,
        paymentId: saved.paymentId,
      }),
    ];

    return {
      paymentId: saved.paymentId,
      orderId,
      status: PaymentStatus.PENDING,
      clientSecret: saved.clientSecret,
      events,
    };
  }

  async authorizeOrderPayment({ paymentId, orderId, method, country, providerCode, metadata = {} }) {
    const id = paymentId || orderId;
    await this.paymentRepository.updatePaymentStatus(id, PaymentStatus.AUTHORIZED, metadata);
    return {
      paymentId: id,
      status: PaymentStatus.AUTHORIZED,
      events: [new PaymentAuthorized(id, { status: PaymentStatus.AUTHORIZED, metadata })],
    };
  }

  async captureOrderPayment({ paymentId, orderId, method, country, providerCode, metadata = {} }) {
    const id = paymentId || orderId;
    await this.paymentRepository.updatePaymentStatus(id, PaymentStatus.PAID, metadata);
    return {
      paymentId: id,
      status: PaymentStatus.PAID,
      events: [new PaymentCaptured(id, { status: PaymentStatus.PAID, metadata })],
    };
  }

  async cancelOrderPayment({ paymentId, orderId, method, country, providerCode, reason, metadata = {} }) {
    const id = paymentId || orderId;
    await this.paymentRepository.updatePaymentStatus(id, PaymentStatus.CANCELLED, { reason, ...metadata });
    return {
      paymentId: id,
      status: PaymentStatus.CANCELLED,
      events: [new PaymentCancelled(id, { status: PaymentStatus.CANCELLED, reason, metadata })],
    };
  }

  async refundOrderPayment({ paymentId, orderId, amount, reason, method, country, providerCode, metadata = {} }) {
    const id = paymentId || orderId;
    await this.paymentRepository.updatePaymentStatus(id, PaymentStatus.REFUNDED, { amount, reason, ...metadata });
    return {
      paymentId: id,
      status: PaymentStatus.REFUNDED,
      amount,
      events: [new PaymentRefunded(id, { amount, reason, status: PaymentStatus.REFUNDED, metadata })],
    };
  }
}

module.exports = OrderPaymentWorkflow;
