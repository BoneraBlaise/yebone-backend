class ReadinessProbe {
  constructor({ container } = {}) {
    this.container = container;
  }

  async check() {
    const checks = [];
    let healthy = true;

    const database = this.container?.resolve("database");
    if (database?.healthCheck) {
      const dbResult = await database.healthCheck.run();
      checks.push({ name: "database", healthy: dbResult.healthy, details: dbResult });
      if (!dbResult.healthy) healthy = false;
    }

    const storage = this.container?.resolve("storage");
    checks.push({
      name: "storage",
      healthy: Boolean(storage?.provider),
      provider: storage?.providerName,
    });
    if (!storage?.provider) healthy = false;

    const email = this.container?.resolve("email");
    checks.push({
      name: "email",
      healthy: Boolean(email?.provider),
      provider: email?.providerName,
    });
    if (!email?.provider) healthy = false;

    const environment = this.container?.resolve("environment");
    if (environment?.validation && !environment.validation.valid) {
      healthy = false;
      checks.push({ name: "environment", healthy: false, details: environment.validation });
    } else {
      checks.push({ name: "environment", healthy: true, profile: environment?.profile?.name });
    }

    return {
      status: healthy ? "ready" : "not_ready",
      healthy,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = ReadinessProbe;
