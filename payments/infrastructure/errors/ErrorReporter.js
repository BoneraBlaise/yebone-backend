/**
 * Error reporter contract — no external error tracking SDK.
 */
class ErrorReporter {
  async report(_error, _context = {}) {
    throw new Error("ErrorReporter.report must be implemented");
  }
}

module.exports = ErrorReporter;
