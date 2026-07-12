const StackTraceFormatter = require("./StackTraceFormatter");

/**
 * In-memory error reporter.
 */
class MemoryErrorReporter {
  constructor() {
    this.reports = [];
  }

  async report(error, context = {}) {
    const report = {
      name: error?.name || "Error",
      message: error?.message || "Unknown error",
      stack: StackTraceFormatter.format(error),
      context,
      reportedAt: new Date().toISOString(),
    };
    this.reports.push(Object.freeze(report));
    return report;
  }

  getReports() {
    return [...this.reports];
  }
}

module.exports = MemoryErrorReporter;
