const PaypackConfig = require("./PaypackConfig");

/**
 * Paypack Refund client — architecture stub only (Phase 2C).
 * Paypack refunds are dashboard-initiated; no public refund API documented.
 */
class PaypackRefundClient {
  constructor({ providerCode = PaypackConfig.providerCode } = {}) {
    this.providerCode = providerCode;
  }

  async refund() {
    const error = new Error("Paypack refund is not implemented — architecture stub only (Phase 2C)");
    error.code = "PAYPACK_REFUND_NOT_IMPLEMENTED";
    error.providerCode = this.providerCode;
    throw error;
  }
}

module.exports = PaypackRefundClient;
