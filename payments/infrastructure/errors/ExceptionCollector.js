/**
 * Exception collector — aggregates errors for reporting.
 */
class ExceptionCollector {
  constructor({ errorReporter }) {
    this.errorReporter = errorReporter;
    this.exceptions = [];
  }

  async capture(error, context = {}) {
    this.exceptions.push({ error, context, capturedAt: new Date().toISOString() });
    return this.errorReporter.report(error, context);
  }

  count() {
    return this.exceptions.length;
  }
}

module.exports = ExceptionCollector;
