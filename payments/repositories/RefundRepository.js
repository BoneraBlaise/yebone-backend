const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Repository skeleton for refunds.
 */
class RefundRepository {
  async save(_refund) {
    throw new NotImplementedError("RefundRepository", "save");
  }

  async findById(_id) {
    throw new NotImplementedError("RefundRepository", "findById");
  }

  async findByPaymentId(_paymentId) {
    throw new NotImplementedError("RefundRepository", "findByPaymentId");
  }
}

module.exports = RefundRepository;
