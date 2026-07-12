const QueueProvider = require("./QueueProvider");

/**
 * In-memory queue provider.
 */
class MemoryQueueProvider extends QueueProvider {
  constructor() {
    super();
    this.topics = new Map();
    this.handlers = new Map();
    this.deadLetterQueue = [];
    this.messageCounter = 0;
  }

  _nextId() {
    this.messageCounter += 1;
    return `msg_${this.messageCounter}`;
  }

  async publish(topic, message, metadata = {}) {
    const id = this._nextId();
    const envelope = {
      id,
      topic,
      message,
      metadata,
      status: "pending",
      attempts: 0,
      publishedAt: new Date().toISOString(),
    };

    if (!this.topics.has(topic)) {
      this.topics.set(topic, []);
    }
    this.topics.get(topic).push(envelope);

    const handler = this.handlers.get(topic);
    if (handler) {
      await handler(envelope);
    }

    return envelope;
  }

  async consume(topic, handler) {
    this.handlers.set(topic, handler);
    return true;
  }

  async ack(messageId) {
    for (const [, messages] of this.topics) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.status = "acked";
        message.ackedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  async retry(messageId) {
    for (const [, messages] of this.topics) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.attempts += 1;
        message.status = "retry";
        message.retriedAt = new Date().toISOString();
        return message;
      }
    }
    return null;
  }

  async deadLetter(messageId, reason) {
    for (const [, messages] of this.topics) {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        message.status = "dead_letter";
        this.deadLetterQueue.push({ ...message, reason, deadLetteredAt: new Date().toISOString() });
        return message;
      }
    }
    return null;
  }

  getDeadLetters() {
    return [...this.deadLetterQueue];
  }
}

module.exports = MemoryQueueProvider;
