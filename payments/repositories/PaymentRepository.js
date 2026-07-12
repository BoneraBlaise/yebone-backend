const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Repository skeleton for order and subscription payments.
 * Persistence layer to be wired when migrations are introduced.
 */
class PaymentRepository {
  async saveOrderPayment(_orderPayment) {
    throw new NotImplementedError("PaymentRepository", "saveOrderPayment");
  }

  async findOrderPaymentById(_id) {
    throw new NotImplementedError("PaymentRepository", "findOrderPaymentById");
  }

  async findOrderPaymentByOrderId(_orderId) {
    throw new NotImplementedError("PaymentRepository", "findOrderPaymentByOrderId");
  }

  async saveSubscriptionPayment(_subscriptionPayment) {
    throw new NotImplementedError("PaymentRepository", "saveSubscriptionPayment");
  }

  async updatePaymentStatus(_id, _status, _metadata = {}) {
    throw new NotImplementedError("PaymentRepository", "updatePaymentStatus");
  }
}

module.exports = PaymentRepository;
