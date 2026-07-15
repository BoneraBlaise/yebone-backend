class AccountNotFoundError extends Error {
  constructor(accountId) {
    super(`Ledger account not found: ${accountId}`);
    this.name = "AccountNotFoundError";
    this.code = "ACCOUNT_NOT_FOUND";
    this.accountId = accountId;
  }
}

module.exports = AccountNotFoundError;
