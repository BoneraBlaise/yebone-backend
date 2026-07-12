/**
 * Queue provider contract — no external queue SDK.
 */
class QueueProvider {
  async publish(_topic, _message, _metadata = {}) {
    throw new Error("QueueProvider.publish must be implemented");
  }

  async consume(_topic, _handler) {
    throw new Error("QueueProvider.consume must be implemented");
  }

  async ack(_messageId) {
    throw new Error("QueueProvider.ack must be implemented");
  }

  async retry(_messageId) {
    throw new Error("QueueProvider.retry must be implemented");
  }

  async deadLetter(_messageId, _reason) {
    throw new Error("QueueProvider.deadLetter must be implemented");
  }
}

module.exports = QueueProvider;
