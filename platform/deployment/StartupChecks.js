class StartupChecks {
  constructor({ container } = {}) {
    this.container = container;
  }

  async runAll() {
    const checks = [];
    checks.push(await this.checkEnvironment());
    checks.push(await this.checkConfiguration());
    checks.push(await this.checkDatabase());
    checks.push(await this.checkStorage());
    checks.push(await this.checkEmail());

    const passed = checks.every((c) => c.healthy);
    return {
      passed,
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  async checkEnvironment() {
    const env = this.container?.resolve("environment");
    return {
      name: "environment",
      healthy: Boolean(env?.validation?.valid ?? true),
      profile: env?.profile?.name || "unknown",
    };
  }

  async checkConfiguration() {
    const config = this.container?.resolve("configuration");
    return {
      name: "configuration",
      healthy: Boolean(config?.list()?.length),
      modules: config?.list() || [],
    };
  }

  async checkDatabase() {
    const database = this.container?.resolve("database");
    if (!database?.healthCheck) {
      return { name: "database", healthy: false, error: "not_registered" };
    }
    const result = await database.healthCheck.run();
    return { name: "database", healthy: result.healthy, details: result };
  }

  async checkStorage() {
    const storage = this.container?.resolve("storage");
    return {
      name: "storage",
      healthy: Boolean(storage?.provider),
      provider: storage?.providerName || "unknown",
    };
  }

  async checkEmail() {
    const email = this.container?.resolve("email");
    const verify = email?.mailer ? await email.mailer.verify() : null;
    return {
      name: "email",
      healthy: Boolean(email?.provider),
      provider: email?.providerName || "unknown",
      verify,
    };
  }
}

module.exports = StartupChecks;
