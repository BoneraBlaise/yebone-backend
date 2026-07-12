/**
 * Structured log formatter — no Winston or Pino.
 */
class LogFormatter {
  static format({ level, message, service, context = {} }) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: service || "yebone-payments",
      message,
      ...context,
    });
  }
}

module.exports = LogFormatter;
