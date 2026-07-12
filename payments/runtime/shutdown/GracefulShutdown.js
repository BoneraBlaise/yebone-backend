/**
 * Graceful shutdown coordinator for payment runtime resources.
 */
class GracefulShutdown {
  constructor({ logger, timeoutMs = 10000 } = {}) {
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.hooks = [];
    this.registered = false;
  }

  onShutdown(name, handler) {
    this.hooks.push({ name, handler });
    return this;
  }

  register(signals = ["SIGTERM", "SIGINT"]) {
    if (this.registered) return this;
    this.registered = true;

    const shutdown = async (signal) => {
      this.logger?.info("Graceful shutdown initiated", { signal });
      const timer = setTimeout(() => {
        this.logger?.error("Graceful shutdown timed out", { timeoutMs: this.timeoutMs });
        process.exit(1);
      }, this.timeoutMs);

      try {
        for (const hook of [...this.hooks].reverse()) {
          await hook.handler(signal);
          this.logger?.info("Shutdown hook completed", { hook: hook.name });
        }
        clearTimeout(timer);
        process.exit(0);
      } catch (error) {
        clearTimeout(timer);
        this.logger?.error("Graceful shutdown failed", { error: error.message });
        process.exit(1);
      }
    };

    signals.forEach((signal) => {
      process.on(signal, () => shutdown(signal));
    });

    return this;
  }
}

module.exports = GracefulShutdown;
