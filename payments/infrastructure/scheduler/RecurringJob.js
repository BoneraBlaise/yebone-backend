/**
 * Recurring job abstraction — interval-based, no cron package.
 */
class RecurringJob {
  constructor({ name, handler, intervalMs, metadata = {} }) {
    this.name = name;
    this.handler = handler;
    this.intervalMs = intervalMs;
    this.metadata = metadata;
    this.status = "registered";
    this.lastRunAt = null;
    this.nextRunAt = Date.now() + intervalMs;
    this.runCount = 0;
  }

  isDue(now = Date.now()) {
    return now >= this.nextRunAt;
  }

  async run(context = {}) {
    this.status = "running";
    this.lastRunAt = new Date().toISOString();
    try {
      const result = await this.handler(context);
      this.runCount += 1;
      this.nextRunAt = Date.now() + this.intervalMs;
      this.status = "idle";
      return result;
    } catch (error) {
      this.status = "failed";
      this.lastError = error.message;
      throw error;
    }
  }
}

module.exports = RecurringJob;
