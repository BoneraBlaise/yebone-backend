const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Repository skeleton for vendor payouts.
 */
class PayoutRepository {
  async save(_payout) {
    throw new NotImplementedError("PayoutRepository", "save");
  }

  async findById(_id) {
    throw new NotImplementedError("PayoutRepository", "findById");
  }

  async findByVendorId(_vendorId, _options = {}) {
    throw new NotImplementedError("PayoutRepository", "findByVendorId");
  }

  async updateStatus(_id, _status, _metadata = {}) {
    throw new NotImplementedError("PayoutRepository", "updateStatus");
  }
}

module.exports = PayoutRepository;
