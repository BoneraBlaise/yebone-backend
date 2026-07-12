const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor({ serviceName = "yebone-payments", level = "info" } = {}) {
    this.serviceName = serviceName;
    this.level = LEVELS[level] ?? LEVELS.info;
  }

  _shouldLog(level) {
    return LEVELS[level] >= this.level;
  }

  _format(level, message, context = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    });
  }

  debug(message, context) {
    if (this._shouldLog("debug")) console.debug(this._format("debug", message, context));
  }

  info(message, context) {
    if (this._shouldLog("info")) console.info(this._format("info", message, context));
  }

  warn(message, context) {
    if (this._shouldLog("warn")) console.warn(this._format("warn", message, context));
  }

  error(message, context) {
    if (this._shouldLog("error")) console.error(this._format("error", message, context));
  }

  child(context = {}) {
    const childLogger = new Logger({ serviceName: this.serviceName, level: Object.keys(LEVELS).find((k) => LEVELS[k] === this.level) });
    childLogger._context = { ...(this._context || {}), ...context };
    const originalFormat = childLogger._format.bind(childLogger);
    childLogger._format = (level, message, ctx = {}) =>
      originalFormat(level, message, { ...(childLogger._context || {}), ...ctx });
    return childLogger;
  }
}

module.exports = Logger;
