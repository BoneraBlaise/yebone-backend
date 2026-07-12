const BackgroundJob = require("./BackgroundJob");

/**
 * In-memory job scheduler — no external queue integration.
 */
class JobScheduler {
  constructor({ logger }) {
    this.logger = logger;
    this.jobs = new Map();
  }

  register(name, handler, metadata = {}) {
    const job = new BackgroundJob({ name, handler, metadata });
    this.jobs.set(name, job);
    this.logger?.info("Background job registered", { job: name });
    return job;
  }

  async run(name, context = {}) {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Background job not found: ${name}`);
    }
    return job.run(context);
  }

  list() {
    return [...this.jobs.values()].map((job) => ({
      name: job.name,
      status: job.status,
      lastRunAt: job.lastRunAt,
      metadata: job.metadata,
    }));
  }
}

module.exports = JobScheduler;
