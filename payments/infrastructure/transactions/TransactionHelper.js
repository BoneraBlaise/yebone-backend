const crypto = require("crypto");
const TransactionConfig = require("./TransactionConfig");

class TransactionHelper {
  static generateTransactionId() {
    return `${TransactionConfig.transactionIdPrefix}_${crypto.randomUUID()}`;
  }

  static normalizeCurrency(currency) {
    const value = String(currency || TransactionConfig.defaultCurrency)
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{3}$/.test(value)) {
      throw new Error(`Invalid currency code: ${currency}`);
    }
    return value;
  }

  static validateAmount(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Transaction amount must be a positive number");
    }
    return value;
  }

  static normalizeOptionalId(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return String(value).trim();
  }
}

module.exports = TransactionHelper;
