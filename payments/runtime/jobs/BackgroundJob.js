/**
 * Background job abstraction — in-memory only, no queues.
 */
class BackgroundJob {
  constructor({ name, handler, metadata = {} }) {
    this.name = name;
    this.handler = handler;
    this.metadata = metadata;
    this.status = "registered";
    this.lastRunAt = null;
    this.lastError = null;
  }

  async run(context = {}) {
    this.status = "running";
    this.lastRunAt = new Date().toISOString();
    try {
      const result = await this.handler(context);
      this.status = "completed";
      return { name: this.name, status: this.status, result };
    } catch (error) {
      this.status = "failed";
      this.lastError = error.message;
      throw error;
    }
  }
}

module.exports = BackgroundJob;
