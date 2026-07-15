const { randomUUID } = require("crypto");
const { LedgerAccountType } = require("./LedgerAccountType");
const InvalidPostingError = require("./errors/InvalidPostingError");
const LedgerConfig = require("./LedgerConfig");

const ACCOUNT_STATUSES = Object.freeze(["ACTIVE", "SUSPENDED", "CLOSED"]);

/**
 * Immutable ledger account definition.
 */
class LedgerAccount {
  static create(input = {}) {
    const account = {
      id: input.id || randomUUID(),
      code: String(input.code || "").trim().toUpperCase(),
      name: String(input.name || "").trim(),
      type: input.type,
      currency: input.currency || LedgerConfig.defaultCurrency,
      status: input.status || "ACTIVE",
      metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
      createdAt: input.createdAt || new Date().toISOString(),
    };

    LedgerAccount.validate(account);
    return Object.freeze(account);
  }

  static validate(account) {
    if (!account || typeof account !== "object") {
      throw new InvalidPostingError("Account must be an object");
    }

    if (!account.code) {
      throw new InvalidPostingError("Account code is required");
    }

    if (!account.name) {
      throw new InvalidPostingError("Account name is required");
    }

    if (!Object.values(LedgerAccountType).includes(account.type)) {
      throw new InvalidPostingError(`Invalid account type: ${account.type}`);
    }

    if (!ACCOUNT_STATUSES.includes(account.status)) {
      throw new InvalidPostingError(`Invalid account status: ${account.status}`);
    }

    if (!LedgerConfig.supportedCurrencies.includes(account.currency)) {
      throw new InvalidPostingError(`Unsupported account currency: ${account.currency}`);
    }

    return true;
  }
}

module.exports = LedgerAccount;
