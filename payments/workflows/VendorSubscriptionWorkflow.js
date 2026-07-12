const NotImplementedError = require("../errors/NotImplementedError");
const { VendorSubscriptionPayment } = require("../domain");
const { PaymentStatus } = require("../enums");
const { PaymentCreated, SubscriptionActivated } = require("../events");

/**
 * Vendor subscription payment workflow.
 */
class VendorSubscriptionWorkflow {
  constructor({ paymentService, paymentRepository, ledger }) {
    this.paymentService = paymentService;
    this.paymentRepository = paymentRepository;
    this.ledger = ledger;
  }

  async createSubscriptionPayment({ vendorId, planId, amount, currency, method, country, metadata = {} }) {
    const draft = new VendorSubscriptionPayment({
      vendorId,
      planId,
      amount,
      currency,
      method,
      status: PaymentStatus.PENDING,
      metadata,
    });

    const events = [
      new PaymentCreated(vendorId, { planId, amount, currency, type: "subscription" }),
    ];

    throw new NotImplementedError("VendorSubscriptionWorkflow", "createSubscriptionPayment");
  }

  async activateSubscription({ subscriptionPaymentId, vendorId, planId, metadata = {} }) {
    const events = [
      new SubscriptionActivated(vendorId, { subscriptionPaymentId, planId, metadata }),
    ];

    throw new NotImplementedError("VendorSubscriptionWorkflow", "activateSubscription");
  }

  async renewSubscription({ subscriptionPaymentId, vendorId, planId, amount, currency, method, country, metadata = {} }) {
    const events = [
      new PaymentCreated(vendorId, { subscriptionPaymentId, planId, amount, type: "renewal" }),
    ];

    throw new NotImplementedError("VendorSubscriptionWorkflow", "renewSubscription");
  }

  async cancelSubscription({ subscriptionPaymentId, vendorId, planId, reason, metadata = {} }) {
    throw new NotImplementedError("VendorSubscriptionWorkflow", "cancelSubscription");
  }
}

module.exports = VendorSubscriptionWorkflow;
