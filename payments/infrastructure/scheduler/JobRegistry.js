const ScheduledJob = require("./ScheduledJob");
const RecurringJob = require("./RecurringJob");

/**
 * Registry for scheduled and recurring jobs.
 */
class JobRegistry {
  constructor() {
    this.scheduled = new Map();
    this.recurring = new Map();
  }

  registerScheduled(job) {
    this.scheduled.set(job.name, job);
    return job;
  }

  registerRecurring(job) {
    this.recurring.set(job.name, job);
    return job;
  }

  getScheduled(name) {
    return this.scheduled.get(name) || null;
  }

  getRecurring(name) {
    return this.recurring.get(name) || null;
  }

  list() {
    return {
      scheduled: [...this.scheduled.keys()],
      recurring: [...this.recurring.keys()],
    };
  }
}

module.exports = JobRegistry;
