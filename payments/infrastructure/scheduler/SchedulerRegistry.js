/**
 * Scheduler registry — evaluates due jobs without external cron.
 */
class SchedulerRegistry {
  constructor({ jobRegistry }) {
    this.jobRegistry = jobRegistry;
  }

  async runDueJobs(context = {}) {
    const results = [];

    for (const job of this.jobRegistry.scheduled.values()) {
      if (job.isDue()) {
        results.push({ type: "scheduled", name: job.name, result: await job.run(context) });
      }
    }

    for (const job of this.jobRegistry.recurring.values()) {
      if (job.isDue()) {
        results.push({ type: "recurring", name: job.name, result: await job.run(context) });
      }
    }

    return results;
  }
}

module.exports = SchedulerRegistry;
