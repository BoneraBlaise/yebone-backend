/**
 * One-time scheduled job abstraction — no cron package.
 */
class ScheduledJob {
  constructor({ name, handler, runAt, metadata = {} }) {
    this.name = name;
    this.handler = handler;
    this.runAt = runAt ? new Date(runAt).getTime() : Date.now();
    this.metadata = metadata;
    this.status = "scheduled";
    this.lastResult = null;
  }

  isDue(now = Date.now()) {
    return now >= this.runAt;
  }

  async run(context = {}) {
    this.status = "running";
    try {
      this.lastResult = await this.handler(context);
      this.status = "completed";
      return this.lastResult;
    } catch (error) {
      this.status = "failed";
      this.lastError = error.message;
      throw error;
    }
  }
}

module.exports = ScheduledJob;
