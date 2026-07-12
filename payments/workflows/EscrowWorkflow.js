const NotImplementedError = require("../errors/NotImplementedError");
const { PaymentStatus } = require("../enums");
const { EscrowReleased } = require("../events");

/**
 * Escrow fund management workflow.
 */
class EscrowWorkflow {
  constructor({ paymentService, ledger }) {
    this.paymentService = paymentService;
    this.ledger = ledger;
  }

  async holdFunds({ orderId, amount, currency, buyerId, vendorId, metadata = {} }) {
    throw new NotImplementedError("EscrowWorkflow", "holdFunds");
  }

  async releaseFunds({ orderId, escrowId, amount, currency, vendorId, metadata = {} }) {
    const events = [
      new EscrowReleased(orderId, { escrowId, amount, currency, vendorId, status: PaymentStatus.PAID }),
    ];

    throw new NotImplementedError("EscrowWorkflow", "releaseFunds");
  }

  async disputeFunds({ orderId, escrowId, reason, metadata = {} }) {
    throw new NotImplementedError("EscrowWorkflow", "disputeFunds");
  }

  async refundEscrow({ orderId, escrowId, amount, currency, reason, metadata = {} }) {
    throw new NotImplementedError("EscrowWorkflow", "refundEscrow");
  }
}

module.exports = EscrowWorkflow;
