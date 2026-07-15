const TransactionConfig = require("./TransactionConfig");
const TransactionRepository = require("./TransactionRepository");
const TransactionService = require("./TransactionService");
const PaymentTransactionStateMachine = require("./PaymentTransactionStateMachine");

/**
 * Factory for wiring the Module 2 transaction foundation via DI.
 */
function createTransactionFoundation(options = {}) {
  const repository = options.repository || new TransactionRepository();
  const stateMachine = options.stateMachine || new PaymentTransactionStateMachine();
  const service = new TransactionService({ repository, stateMachine });
  return { repository, stateMachine, service };
}

module.exports = {
  TransactionConfig,
  PaymentTransactionStatus: require("./PaymentTransactionStatus"),
  PaymentTransactionStateMachine,
  PaymentTransaction: require("./PaymentTransaction.model"),
  TransactionHelper: require("./TransactionHelper"),
  TransactionRepository,
  TransactionService,
  TransactionNotFoundError: require("./errors/TransactionNotFoundError"),
  TransactionStatusConflictError: require("./errors/TransactionStatusConflictError"),
  createTransactionFoundation,
};
