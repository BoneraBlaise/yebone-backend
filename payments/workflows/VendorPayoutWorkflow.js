const NotImplementedError = require("../errors/NotImplementedError");
const { VendorPayout } = require("../domain");
const { PayoutStatus } = require("../enums");
const { VendorPayoutQueued, VendorPayoutCompleted } = require("../events");

/**
 * Vendor payout workflow.
 */
class VendorPayoutWorkflow {
  constructor({ paymentService, payoutRepository, ledger }) {
    this.paymentService = paymentService;
    this.payoutRepository = payoutRepository;
    this.ledger = ledger;
  }

  async queueVendorPayout({ vendorId, amount, currency, method, destinationAccount, metadata = {} }) {
    const draft = new VendorPayout({
      vendorId,
      amount,
      currency,
      method,
      status: PayoutStatus.PENDING,
      destinationAccount,
      metadata,
    });

    const events = [
      new VendorPayoutQueued(vendorId, { amount, currency, method, status: PayoutStatus.PENDING }),
    ];

    throw new NotImplementedError("VendorPayoutWorkflow", "queueVendorPayout");
  }

  async approveVendorPayout({ payoutId, vendorId, approvedBy, metadata = {} }) {
    throw new NotImplementedError("VendorPayoutWorkflow", "approveVendorPayout");
  }

  async rejectVendorPayout({ payoutId, vendorId, reason, metadata = {} }) {
    throw new NotImplementedError("VendorPayoutWorkflow", "rejectVendorPayout");
  }

  async executeVendorPayout({ payoutId, vendorId, method, country, providerCode, metadata = {} }) {
    const events = [
      new VendorPayoutCompleted(vendorId, { payoutId, status: PayoutStatus.COMPLETED }),
    ];

    throw new NotImplementedError("VendorPayoutWorkflow", "executeVendorPayout");
  }
}

module.exports = VendorPayoutWorkflow;
