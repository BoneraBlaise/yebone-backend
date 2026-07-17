const WebhookReconciliationConfig = require("./WebhookReconciliationConfig");

/**
 * Rejects webhook events outside the configured replay window.
 */
class WebhookReplayGuard {
  constructor(options = {}) {
    this.replayWindowSeconds =
      options.replayWindowSeconds || WebhookReconciliationConfig.webhookReplayWindowSeconds;
    this.futureSkewSeconds =
      options.futureSkewSeconds || WebhookReconciliationConfig.webhookFutureSkewSeconds;
  }

  assertWithinWindow(input = {}) {
    const eventTimestamp = WebhookReplayGuard._resolveTimestamp(input);
    if (!eventTimestamp) {
      return Object.freeze({ allowed: true, reason: "NO_TIMESTAMP" });
    }

    const now = Date.now();
    const eventMs = eventTimestamp.getTime();
    const ageSeconds = (now - eventMs) / 1000;
    const futureSeconds = (eventMs - now) / 1000;

    if (futureSeconds > this.futureSkewSeconds) {
      return Object.freeze({
        allowed: false,
        reason: "FUTURE_TIMESTAMP",
        ageSeconds,
        futureSeconds,
      });
    }

    if (ageSeconds > this.replayWindowSeconds) {
      return Object.freeze({
        allowed: false,
        reason: "REPLAY_WINDOW_EXCEEDED",
        ageSeconds,
      });
    }

    return Object.freeze({ allowed: true, reason: "WITHIN_WINDOW", ageSeconds });
  }

  static _resolveTimestamp(input) {
    const candidates = [
      input.eventTimestamp,
      input.timestamp,
      input.payload?.timestamp,
      input.payload?.createdAt,
      input.payload?.eventTime,
      input.payload?.time,
    ];

    for (const value of candidates) {
      if (!value) continue;
      const date = value instanceof Date ? value : new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }
}

module.exports = WebhookReplayGuard;
