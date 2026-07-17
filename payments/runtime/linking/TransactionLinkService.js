const TransactionLink = require("./TransactionLink.model");

/**
 * Canonical mapping layer between legacy and Module 2 transaction identifiers.
 * Stores references only — never duplicates business state.
 */
class TransactionLinkService {
  constructor({ repository }) {
    if (!repository) {
      throw new Error("TransactionLinkService requires repository");
    }
    this.repository = repository;
  }

  async link(input = {}) {
    if (input.providerReference) {
      const existing = await this.repository.findByProviderReference(input.providerReference);
      if (existing) {
        return existing;
      }
    }

    if (input.module2TransactionId) {
      const existing = await this.repository.findByModule2TransactionId(input.module2TransactionId);
      if (existing) {
        return existing;
      }
    }

    if (input.legacyTransactionId) {
      const existing = await this.repository.findByLegacyTransactionId(input.legacyTransactionId);
      if (existing) {
        return existing;
      }
    }

    const record = TransactionLink.create(input);
    return this.repository.save(record);
  }

  async findByLegacyTransactionId(legacyTransactionId) {
    return this.repository.findByLegacyTransactionId(legacyTransactionId);
  }

  async findByModule2TransactionId(module2TransactionId) {
    return this.repository.findByModule2TransactionId(module2TransactionId);
  }

  async findByProviderReference(providerReference) {
    return this.repository.findByProviderReference(providerReference);
  }

  async findByPaymentReference(paymentReference) {
    return this.repository.findByPaymentReference(paymentReference);
  }

  async findByOrderId(orderId) {
    return this.repository.findByOrderId(orderId);
  }

  async findByCorrelationId(correlationId) {
    return this.repository.findByCorrelationId(correlationId);
  }

  async resolveModule2TransactionId({ providerReference, paymentReference, orderId, legacyTransactionId }) {
    if (providerReference) {
      const link = await this.findByProviderReference(providerReference);
      if (link) {
        return link.module2TransactionId;
      }
    }

    if (paymentReference) {
      const link = await this.findByPaymentReference(paymentReference);
      if (link) {
        return link.module2TransactionId;
      }
    }

    if (orderId) {
      const link = await this.findByOrderId(orderId);
      if (link) {
        return link.module2TransactionId;
      }
    }

    if (legacyTransactionId) {
      const link = await this.findByLegacyTransactionId(legacyTransactionId);
      if (link) {
        return link.module2TransactionId;
      }
    }

    return null;
  }

  async resolveLinkForWebhook({ providerReference, paymentReference, orderId, correlationId }) {
    if (providerReference) {
      const link = await this.findByProviderReference(providerReference);
      if (link) {
        return link;
      }
    }

    if (paymentReference) {
      const link = await this.findByPaymentReference(paymentReference);
      if (link) {
        return link;
      }
    }

    if (orderId) {
      const link = await this.findByOrderId(orderId);
      if (link) {
        return link;
      }
    }

    if (correlationId) {
      return this.findByCorrelationId(correlationId);
    }

    return null;
  }
}

module.exports = TransactionLinkService;
