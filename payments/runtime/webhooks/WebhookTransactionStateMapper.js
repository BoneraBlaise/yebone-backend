const PaymentTransactionStatus = require("../../infrastructure/transactions/PaymentTransactionStatus");

const S = PaymentTransactionStatus;

/**
 * Maps provider webhook payloads to Module 2 transaction statuses.
 */
class WebhookTransactionStateMapper {
  static resolveTargetStatus({ payload = {}, verification = {} }) {
    const event = String(
      payload.event ||
        payload.eventType ||
        payload.status ||
        payload.type ||
        verification.status ||
        ""
    )
      .trim()
      .toLowerCase();

    if (WebhookTransactionStateMapper._matches(event, ["failed", "failure", "rejected", "signature_invalid"])) {
      return S.FAILED;
    }

    if (WebhookTransactionStateMapper._matches(event, ["cancelled", "canceled", "void"])) {
      return S.CANCELLED;
    }

    if (WebhookTransactionStateMapper._matches(event, ["expired", "timeout"])) {
      return S.EXPIRED;
    }

    if (WebhookTransactionStateMapper._matches(event, ["refunded", "refund.completed"])) {
      return S.REFUNDED;
    }

    if (WebhookTransactionStateMapper._matches(event, ["partially_refunded", "partial_refund"])) {
      return S.PARTIALLY_REFUNDED;
    }

    if (WebhookTransactionStateMapper._matches(event, ["settled", "settlement.completed"])) {
      return S.SETTLED;
    }

    if (
      WebhookTransactionStateMapper._matches(event, [
        "authorized",
        "auth.completed",
        "payment.authorized",
      ])
    ) {
      return S.AUTHORIZED;
    }

    if (
      WebhookTransactionStateMapper._matches(event, [
        "pending",
        "processing",
        "payment.pending",
      ])
    ) {
      return S.PENDING;
    }

    if (
      WebhookTransactionStateMapper._matches(event, [
        "completed",
        "successful",
        "success",
        "payment.completed",
        "checkout.completed",
        "captured",
        "verified",
      ])
    ) {
      return S.CAPTURED;
    }

    if (verification.verified === true || verification.mock === true) {
      return S.CAPTURED;
    }

    return null;
  }

  static extractEventType(payload = {}) {
    return (
      payload.event ||
      payload.eventType ||
      payload.status ||
      payload.type ||
      null
    );
  }

  static _matches(event, patterns) {
    return patterns.some((pattern) => event.includes(pattern));
  }
}

module.exports = WebhookTransactionStateMapper;
