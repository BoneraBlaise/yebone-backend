/**
 * HTTP request logger abstraction.
 */
class RequestLogger {
  constructor({ logger, monitoring }) {
    this.logger = logger;
    this.monitoring = monitoring;
  }

  logRequest({ method, path, correlationId, statusCode, durationMs }) {
    this.logger.info("HTTP request", { method, path, correlationId, statusCode, durationMs });
    this.monitoring?.application.recordRequest(path);
    if (durationMs !== undefined) {
      this.monitoring?.application.recordLatency(path, durationMs);
    }
    if (statusCode >= 500) {
      this.monitoring?.application.recordError(path, "server_error");
    }
  }
}

module.exports = RequestLogger;
