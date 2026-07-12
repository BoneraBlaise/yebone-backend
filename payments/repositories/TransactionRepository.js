const NotImplementedError = require("../errors/NotImplementedError");

/**
 * Repository skeleton for ledger transactions.
 */
class TransactionRepository {
  async save(_transaction) {
    throw new NotImplementedError("TransactionRepository", "save");
  }

  async findById(_id) {
    throw new NotImplementedError("TransactionRepository", "findById");
  }

  async findByReferenceId(_referenceId) {
    throw new NotImplementedError("TransactionRepository", "findByReferenceId");
  }

  async listByOwner(_ownerId, _options = {}) {
    throw new NotImplementedError("TransactionRepository", "listByOwner");
  }
}

module.exports = TransactionRepository;
