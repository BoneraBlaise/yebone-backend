const LogLevel = require("./LogLevel");
const LogFormatter = require("./LogFormatter");

/**
 * Structured logger abstraction.
 */
class StructuredLogger {
  constructor({ serviceName = "yebone-payments", level = LogLevel.INFO } = {}) {
    this.serviceName = serviceName;
    this.level = level;
  }

  _log(levelName, levelValue, message, context = {}) {
    if (levelValue < this.level) return;
    const output = LogFormatter.format({
      level: levelName,
      message,
      service: this.serviceName,
      context,
    });
    if (levelValue >= LogLevel.ERROR) {
      console.error(output);
    } else if (levelValue >= LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message, context) {
    this._log("debug", LogLevel.DEBUG, message, context);
  }

  info(message, context) {
    this._log("info", LogLevel.INFO, message, context);
  }

  warn(message, context) {
    this._log("warn", LogLevel.WARN, message, context);
  }

  error(message, context) {
    this._log("error", LogLevel.ERROR, message, context);
  }
}

module.exports = StructuredLogger;
