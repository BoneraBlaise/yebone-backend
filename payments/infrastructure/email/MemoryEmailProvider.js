const EmailProvider = require("./EmailProvider");

/**
 * In-memory email provider — records messages only.
 */
class MemoryEmailProvider extends EmailProvider {
  constructor() {
    super();
    this.sent = [];
    this.queued = [];
  }

  async send(message) {
    const record = { ...message, status: "sent", sentAt: new Date().toISOString() };
    this.sent.push(record);
    return record;
  }

  async sendTemplate(templateId, data) {
    return this.send({ templateId, data, type: "template" });
  }

  async queue(message) {
    const record = { ...message, status: "queued", queuedAt: new Date().toISOString() };
    this.queued.push(record);
    return record;
  }

  getHistory() {
    return { sent: [...this.sent], queued: [...this.queued] };
  }
}

module.exports = MemoryEmailProvider;
